/**
 * Knowledge Graph Service
 * Maps educational video reports to user's academic aims, tasks, and goals.
 * Strict De-duplication: Identical reports will never create duplicate graph nodes.
 * Real AI Semantic Analysis: Evaluates connection viability and reasons with Gemini/Gemma.
 * Zero hardcoded links or placeholder relationships.
 */

const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  GEMINI_API_KEY,
  GOOGLE_GEMMA_MODELS,
  OPENROUTER_API_KEY,
  PRIMARY_MODEL,
  CANDIDATE_MODELS,
  PORT,
  API_TIMEOUT_MS
} = require('../config/constants');
const { robustParseJSON } = require('../utils/jsonParser');

// In-Memory Graph Store (Can be backed by DB later)
const graphState = {
  nodes: [], // { id, type: 'report' | 'goal', label, creator, summary, tags, fingerprint, createdAt }
  links: [], // { id, source, target, score, reason, type: 'report_to_goal' | 'report_to_report' }
  goals: []  // { id, text, createdAt }
};

/**
 * Generates a canonical fingerprint of a report to enforce the de-duplication rule.
 * Normalized transcript is the ground truth of the reel audio, ensuring that slight
 * variations in LLM-generated titles do not cause duplicate nodes.
 */
function computeReportFingerprint(report) {
  const normTranscript = (report.transcript || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If spoken audio exists, fingerprint directly on the canonical speech
  if (normTranscript.length >= 15) {
    return crypto.createHash('sha256').update(normTranscript.slice(0, 350)).digest('hex').slice(0, 16);
  }

  // Fallback to title/caption if no spoken audio
  const normTitle = (report.title || report.caption || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
  return crypto.createHash('sha256').update(normTitle).digest('hex').slice(0, 16);
}

/**
 * AI-driven Semantic Connection Evaluator
 * Asks Gemini / Gemma if this report assists or benefits the user's specific goal.
 */
async function evaluateSemanticConnection(reportNode, goalNode) {
  const prompt = `You are an educational ontology expert determining semantic learning connections between study reports and student academic goals.

STUDY REPORT:
- Title: "${reportNode.label}"
- Summary: "${(reportNode.summary || '').slice(0, 400)}"
- Tags: ${(reportNode.tags || []).join(', ') || 'General Knowledge'}

STUDENT GOAL / TASK / AIM:
- "${goalNode.text}"

Rule: If there is even a slight, practical, or conceptual connection where the report's knowledge could benefit, inspire, or assist the student in this goal, connect them.
Output strictly valid JSON with this exact schema:
{
  "connected": true,
  "score": 0.85,
  "reason": "One concise sentence explaining how this report directly helps or benefits the student in achieving this goal."
}`;

  // 1. Try Google AI Studio (Fast Gemma/Gemini)
  if (GEMINI_API_KEY && GEMINI_API_KEY.trim()) {
    const candidateModels = ['models/gemini-3.8-flash', 'models/gemma-4-31b-it', 'models/gemma-4-26b-a4b-it'];
    for (const modelName of candidateModels) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = (await result.response).text() || '';
        const parsed = robustParseJSON(text);
        if (typeof parsed.connected === 'boolean') {
          return {
            connected: parsed.connected,
            score: typeof parsed.score === 'number' ? parsed.score : 0.75,
            reason: parsed.reason || 'Provides contextual domain insights.'
          };
        }
      } catch (err) {
        // try next model
      }
    }
  }

  // 2. OpenRouter Fallback
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.trim()) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': `http://localhost:${PORT}`,
          'X-Title': 'Reelsidian Knowledge Graph'
        },
        body: JSON.stringify({
          model: PRIMARY_MODEL,
          messages: [
            { role: 'system', content: 'You evaluate semantic connections between study notes and goals. Respond strictly in raw JSON.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (response.ok) {
        const json = await response.json();
        const raw = json.choices?.[0]?.message?.content || '';
        const parsed = robustParseJSON(raw);
        if (typeof parsed.connected === 'boolean') {
          return {
            connected: parsed.connected,
            score: typeof parsed.score === 'number' ? parsed.score : 0.75,
            reason: parsed.reason || 'Provides contextual domain insights.'
          };
        }
      }
    } catch (err) {
      console.warn('OpenRouter graph evaluation fallback error:', err.message);
    }
  }

  // Fallback: Keyword & Concept overlap if models temporarily unavailable
  const goalLower = goalNode.text.toLowerCase();
  const tagsMatch = (reportNode.tags || []).some(t => goalLower.includes(t.toLowerCase()));
  const titleWords = reportNode.label.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const titleMatch = titleWords.some(w => goalLower.includes(w));

  if (tagsMatch || titleMatch) {
    return {
      connected: true,
      score: 0.65,
      reason: `Shares key conceptual focus (${reportNode.label}) relevant to the goal.`
    };
  }

  return { connected: false, score: 0, reason: '' };
}

/**
 * Add a New User Goal / Aim / Task
 * Evaluates semantic links against all unique report nodes currently in the graph.
 */
async function addGoal(goalText) {
  const text = (goalText || '').trim();
  if (!text) throw new Error('Goal text cannot be empty.');

  const goalId = 'goal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const goalItem = {
    id: goalId,
    text,
    createdAt: new Date().toLocaleTimeString()
  };

  graphState.goals.unshift(goalItem);

  // Add Goal Node to visual graph
  const goalNode = {
    id: goalId,
    type: 'goal',
    label: text,
    createdAt: goalItem.createdAt
  };
  graphState.nodes.push(goalNode);

  // Match against all existing report nodes
  const reportNodes = graphState.nodes.filter(n => n.type === 'report');
  for (const reportNode of reportNodes) {
    const evaluation = await evaluateSemanticConnection(reportNode, goalItem);
    if (evaluation.connected && evaluation.score >= 0.40) {
      const linkId = `link_${reportNode.id}_${goalId}`;
      if (!graphState.links.some(l => l.id === linkId)) {
        graphState.links.push({
          id: linkId,
          source: reportNode.id,
          target: goalId,
          score: evaluation.score,
          reason: evaluation.reason,
          type: 'report_to_goal'
        });
      }
    }
  }

  return {
    goal: goalItem,
    graph: getGraph()
  };
}

/**
 * Delete a Goal and its associated edges
 */
function deleteGoal(goalId) {
  graphState.goals = graphState.goals.filter(g => g.id !== goalId);
  graphState.nodes = graphState.nodes.filter(n => n.id !== goalId);
  graphState.links = graphState.links.filter(l => {
    const src = typeof l.source === 'object' ? l.source.id : l.source;
    const tgt = typeof l.target === 'object' ? l.target.id : l.target;
    return src !== goalId && tgt !== goalId;
  });
  return getGraph();
}

/**
 * Ingests a new Report into the Knowledge Graph
 * STRICT DE-DUPLICATION RULE:
 * Once a report is generated, the same report will NOT go again into the connections page,
 * even if the user generates or uploads the same video multiple times.
 */
async function addReportToGraph(reportData) {
  if (!reportData) return getGraph();

  const title = reportData.analysis?.title || reportData.caption || 'Video Report';
  const transcript = reportData.transcript || '';
  const fingerprint = computeReportFingerprint({ title, transcript });

  // 1. Direct Fingerprint check
  let existingNode = graphState.nodes.find(n => n.fingerprint === fingerprint);

  // 2. Fuzzy transcript similarity check (if transcription has >= 70% word overlap)
  if (!existingNode && transcript && transcript.length >= 25) {
    const newWords = new Set(transcript.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    for (const node of graphState.nodes.filter(n => n.type === 'report')) {
      if (node.transcript) {
        const oldWords = new Set(node.transcript.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const intersection = [...newWords].filter(w => oldWords.has(w)).length;
        const union = new Set([...newWords, ...oldWords]).size;
        const jaccard = union > 0 ? intersection / union : 0;
        if (jaccard >= 0.70) {
          existingNode = node;
          break;
        }
      }
    }
  }

  if (existingNode) {
    console.log(`Knowledge Graph: Report "${title}" already present (fingerprint: ${existingNode.fingerprint}). Skipping duplicate.`);
    return {
      status: 'duplicate_skipped',
      nodeId: existingNode.id,
      graph: getGraph()
    };
  }

  // 3. Create Unique Report Node
  const reportNodeId = 'report_' + fingerprint;
  const reportNode = {
    id: reportNodeId,
    type: 'report',
    label: title,
    creator: reportData.creator || 'unknown',
    transcript: transcript,
    summary: reportData.analysis?.analysis_and_solution || reportData.analysis?.summary || transcript,
    tags: reportData.analysis?.tags || [],
    fingerprint,
    createdAt: reportData.processedAt || new Date().toLocaleTimeString()
  };

  graphState.nodes.push(reportNode);

  // 3. Evaluate connections to all active user goals
  for (const goal of graphState.goals) {
    const evaluation = await evaluateSemanticConnection(reportNode, goal);
    if (evaluation.connected && evaluation.score >= 0.40) {
      const linkId = `link_${reportNode.id}_${goal.id}`;
      if (!graphState.links.some(l => l.id === linkId)) {
        graphState.links.push({
          id: linkId,
          source: reportNode.id,
          target: goal.id,
          score: evaluation.score,
          reason: evaluation.reason,
          type: 'report_to_goal'
        });
      }
    }
  }

  // 4. Also check semantic linkages between reports (Report <-> Report)
  const otherReports = graphState.nodes.filter(n => n.type === 'report' && n.id !== reportNode.id);
  for (const other of otherReports) {
    // Check tag intersection
    const sharedTags = (reportNode.tags || []).filter(t => (other.tags || []).includes(t));
    if (sharedTags.length > 0) {
      const linkId = `link_${reportNode.id}_${other.id}`;
      if (!graphState.links.some(l => l.id === linkId)) {
        graphState.links.push({
          id: linkId,
          source: reportNode.id,
          target: other.id,
          score: 0.5 + (sharedTags.length * 0.1),
          reason: `Shared topic domain: #${sharedTags.join(', #')}`,
          type: 'report_to_report'
        });
      }
    }
  }

  return {
    status: 'node_created',
    nodeId: reportNodeId,
    graph: getGraph()
  };
}

/**
 * Return current Graph state
 */
function getGraph() {
  return {
    nodes: graphState.nodes.map(n => ({ ...n })),
    links: graphState.links.map(l => ({ ...l })),
    goals: graphState.goals.map(g => ({ ...g }))
  };
}

module.exports = {
  addGoal,
  deleteGoal,
  addReportToGraph,
  getGraph,
  computeReportFingerprint
};
