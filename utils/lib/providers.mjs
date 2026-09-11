// OpenRouter conventions adapted from mk-x; HUIT paths from ll-utilities.
export const providers = {
  openrouter: {base: 'https://openrouter.ai/api/v1', key: 'OPENROUTER_API_KEY', header: 'Authorization', prefix: 'Bearer '},
  fal: {base: 'https://queue.fal.run', key: 'FAL_API_KEY', header: 'Authorization', prefix: 'Key '},
  'huit-openai': {base: 'https://apis.huit.harvard.edu/ais-openai-direct/v2', key: 'HUIT_API_KEY', header: 'api-key'},
  'huit-gemini': {base: 'https://apis.huit.harvard.edu/ais-google-gemini', key: 'HUIT_API_KEY', header: 'api-key'},
  'huit-bedrock': {base: 'https://apis.huit.harvard.edu/ais-bedrock-llm', key: 'HUIT_API_KEY', header: 'x-api-key'},
};

function rejectOptions(o, names, provider) {
  for (const name of names) if (o[name] !== undefined) throw new Error(`--${name} is not mapped for ${provider}; use --params-file with that model's native schema.`);
}

export function buildRequest(kind, provider, model, prompt, o = {}, refs = [], params = {}) {
  if (!providers[provider]) throw new Error(`Unknown provider: ${provider}`);
  if (!model?.trim()) throw new Error('--model is required (use the selected provider\'s model ID).');
  if (params.stream) throw new Error('Streaming is not supported by these commands.');
  let path, body;
  if (kind === 'text') {
    if (provider === 'fal') {
      path = '/fal-ai/any-llm'; body = {...params, model, prompt};
      if (o.system) body.system_prompt = o.system;
      if (o['max-tokens']) body.max_tokens = o['max-tokens'];
      if (o.temperature !== undefined) body.temperature = o.temperature;
    } else if (provider === 'huit-gemini') {
      path = `/v1beta/models/${encodeURIComponent(model.replace(/^models\//, ''))}:generateContent`;
      body = {...params, contents: [{role: 'user', parts: [{text: prompt}]}]};
      if (o.system) body.systemInstruction = {parts: [{text: o.system}]};
      body.generationConfig = {...params.generationConfig};
      if (o['max-tokens']) body.generationConfig.maxOutputTokens = o['max-tokens'];
      if (o.temperature !== undefined) body.generationConfig.temperature = o.temperature;
    } else if (provider === 'huit-bedrock') {
      if (model === 'claude-fable-5') model = 'global.anthropic.claude-fable-5';
      const native = model === 'global.anthropic.claude-fable-5';
      path = `/v2/model/${encodeURIComponent(model)}/${native ? 'invoke' : 'converse'}`;
      body = native ? {...params, anthropic_version: 'bedrock-2023-05-31', max_tokens: o['max-tokens'] || params.max_tokens || 1024, messages: [{role: 'user', content: [{type: 'text', text: prompt}]}]}
        : {...params, messages: [{role: 'user', content: [{text: prompt}]}], inferenceConfig: {...params.inferenceConfig}};
      if (o.system) body.system = native ? o.system : [{text: o.system}];
      if (o['max-tokens'] && !native) body.inferenceConfig.maxTokens = o['max-tokens'];
      if (o.temperature !== undefined) { if (native) body.temperature = o.temperature; else body.inferenceConfig.temperature = o.temperature; }
    } else {
      path = '/chat/completions'; body = {...params, model, messages: [], stream: false};
      if (o.system) body.messages.push({role: 'system', content: o.system});
      body.messages.push({role: 'user', content: prompt});
      if (o['max-tokens']) body[provider === 'openrouter' ? 'max_tokens' : 'max_completion_tokens'] = o['max-tokens'];
      if (o.temperature !== undefined) body.temperature = o.temperature;
    }
  } else if (provider === 'openrouter') {
    rejectOptions(o, ['ref-field'], provider);
    path = '/images'; body = {...params, model, prompt};
    for (const [flag, key] of Object.entries({aspect: 'aspect_ratio', resolution: 'resolution', format: 'output_format', quality: 'quality', size: 'size', n: 'n'})) if (o[flag] !== undefined) body[key] = o[flag];
    if (refs.length) body.input_references = refs.map(r => ({type: 'image_url', image_url: {url: r.url}}));
  } else if (provider === 'fal') {
    rejectOptions(o, ['size', 'quality'], provider);
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(model) || model.split('/').includes('..')) throw new Error('fal image --model must be an endpoint ID, not a URL.');
    path = `/${model}`; body = {...params, prompt};
    for (const [flag, key] of Object.entries({aspect: 'aspect_ratio', resolution: 'resolution', format: 'output_format', n: 'num_images'})) if (o[flag] !== undefined) body[key] = o[flag];
    if (refs.length) {
      const field = o['ref-field'] || 'image_urls';
      if (!['image_urls', 'image_url'].includes(field)) throw new Error('--ref-field must be image_urls or image_url.');
      if (field === 'image_url' && refs.length !== 1) throw new Error('This endpoint accepts one reference image.');
      body[field] = field === 'image_url' ? refs[0].url : refs.map(r => r.url);
    }
  } else if (provider === 'huit-openai') {
    rejectOptions(o, ['aspect', 'resolution', 'ref-field'], provider);
    if (refs.length) throw new Error('HUIT OpenAI reference-image editing is not bundled; select huit-gemini or another image provider explicitly.');
    path = '/images/generations'; body = {...params, model, prompt};
    for (const [flag, key] of Object.entries({size: 'size', quality: 'quality', format: 'output_format', n: 'n'})) if (o[flag] !== undefined) body[key] = o[flag];
  } else if (provider === 'huit-gemini') {
    rejectOptions(o, ['quality', 'format', 'size', 'ref-field'], provider);
    if (o.n !== undefined && o.n !== 1) throw new Error('HUIT Gemini supports one candidate per invocation here.');
    path = `/v1beta/models/${encodeURIComponent(model.replace(/^models\//, ''))}:generateContent`;
    body = {...params, contents: [{role: 'user', parts: [{text: prompt}, ...refs.map(r => ({inlineData: {mimeType: r.mime, data: r.data.toString('base64')}}))]}], generationConfig: {...params.generationConfig, responseModalities: ['TEXT', 'IMAGE']}};
    if (o.aspect || o.resolution) {
      body.generationConfig.imageConfig = {...params.generationConfig?.imageConfig};
      if (o.aspect) body.generationConfig.imageConfig.aspectRatio = o.aspect;
      if (o.resolution) body.generationConfig.imageConfig.imageSize = o.resolution;
    }
  } else throw new Error('HUIT Bedrock image bodies are model-specific and are not bundled. Use huit-openai, huit-gemini, openrouter, or fal.');
  return {provider, model, url: providers[provider].base + path, body};
}

export function textResult(result) {
  if (typeof result.output === 'string') return result.output; // fal
  if (typeof result.output_text === 'string') return result.output_text;
  const chat = result.choices?.[0]?.message;
  if (typeof chat?.content === 'string') return chat.content;
  const parts = result.output?.message?.content || result.candidates?.[0]?.content?.parts || result.content || chat?.content || [];
  return Array.isArray(parts) ? parts.filter(p => !p.thought).map(p => p.text || '').join('') : '';
}

export function imageResults(result) {
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.images)) return result.images;
  return (result.candidates?.[0]?.content?.parts || []).filter(p => !p.thought && (p.inlineData || p.inline_data)).map(p => {
    const image = p.inlineData || p.inline_data;
    return {b64_json: image.data, media_type: image.mimeType || image.mime_type};
  });
}
