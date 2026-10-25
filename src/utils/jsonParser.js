/**
 * Resilient JSON Parser for LLM Outputs
 * Accurately extracts JSON blocks produced by reasoning models (like Gemma 4 MoE)
 * Zero hardcoded fallback strings. Pure authentic model parsing.
 */

function cleanJsonString(str) {
  if (!str || typeof str !== 'string') return '';

  // 1. If markdown code fences exist, reasoning models place their final answer in the LAST code block!
  const codeBlocks = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
  if (codeBlocks && codeBlocks.length > 0) {
    const lastBlock = codeBlocks[codeBlocks.length - 1];
    let candidate = lastBlock.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      let cleaned = candidate.slice(start, end + 1);
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1'); // remove trailing commas
      cleaned = cleaned.replace(/^\s*\/\/.*$/gm, '');        // remove full-line comments safely
      return cleaned;
    }
  }

  // 2. Otherwise, look for the JSON object in the entire string
  const start = str.lastIndexOf('{\n  "title"');
  const actualStart = start !== -1 ? start : str.indexOf('{');
  const end = str.lastIndexOf('}');
  if (actualStart === -1 || end === -1 || actualStart >= end) {
    return '';
  }

  let cleaned = str.slice(actualStart, end + 1);
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  cleaned = cleaned.replace(/^\s*\/\/.*$/gm, '');
  return cleaned;
}

// Correctly sanitizes unescaped control characters inside quoted string literals only
function sanitizeStringLiterals(str) {
  let inString = false;
  let escaped = false;
  let out = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && !escaped) {
      inString = !inString;
      out += char;
    } else if (char === '\\' && !escaped) {
      escaped = true;
      out += char;
    } else {
      if (inString) {
        if (char === '\n') {
          out += '\\n';
        } else if (char === '\r') {
          out += '\\r';
        } else if (char === '\t') {
          out += '\\t';
        } else if (char.charCodeAt(0) < 32) {
          // ignore unprintable control characters inside string
        } else {
          out += char;
        }
      } else {
        out += char;
      }
      escaped = false;
    }
  }
  return out;
}

function robustParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or invalid text received from model.');
  }

  const cleaned = cleanJsonString(rawText);

  if (!cleaned) {
    throw new Error('No valid JSON object found in model output.');
  }

  // Pass 1: Direct clean parse
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    // Pass 2: Sanitize control characters inside string literals only
    try {
      const sanitized = sanitizeStringLiterals(cleaned);
      return JSON.parse(sanitized);
    } catch (err2) {
      throw new Error(`Failed to parse model JSON: ${err1.message}`);
    }
  }
}

module.exports = {
  cleanJsonString,
  robustParseJSON
};
