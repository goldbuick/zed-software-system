// This file manages loading and running models with @huggingface/transformers
import {
  AutoModelForCausalLM,
  AutoModelForSeq2SeqLM,
  AutoTokenizer,
  Message,
  ProgressInfo,
  TextStreamer,
} from '@huggingface/transformers'

type MODEL_CATEGORY = 'causal' | 'seq2seq'

export const MODEL_ID = 'onnx-community/LFM2-350M-ONNX'

const CHAT_TEMPLATE = `
{%- if tools %}
    {{- '<|im_start|>system\n' }}
    {%- if messages[0].role == 'system' %}
        {{- messages[0].content + '\n\n' }}
    {%- endif %}
    {{- "# Tools\n\nYou may call one or more functions to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n<tools>" }}
    {%- for tool in tools %}
        {{- "\n" }}
        {{- tool | tojson }}
    {%- endfor %}
    {{- "\n</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{\\"name\\": <function-name>, \\"arguments\\": <args-json-object>}\n</tool_call><|im_end|>\n" }}
{%- else %}
    {%- if messages[0].role == 'system' %}
        {{- '<|im_start|>system\n' + messages[0].content + '<|im_end|>\n' }}
    {%- endif %}
{%- endif %}
{%- set ns = namespace(multi_step_tool=true, last_query_index=messages|length - 1) %}
{%- for message in messages[::-1] %}
    {%- set index = (messages|length - 1) - loop.index0 %}
    {%- if ns.multi_step_tool and message.role == "user" and message.content is string and not(message.content.startswith('<tool_response>') and message.content.endswith('</tool_response>')) %}
        {%- set ns.multi_step_tool = false %}
        {%- set ns.last_query_index = index %}
    {%- endif %}
{%- endfor %}
{%- for message in messages %}
    {%- if message.content is string %}
        {%- set content = message.content %}
    {%- else %}
        {%- set content = '' %}
    {%- endif %}
    {%- if (message.role == "user") or (message.role == "system" and not loop.first) %}
        {{- '<|im_start|>' + message.role + '\n' + content + '<|im_end|>' + '\n' }}
    {%- elif message.role == "assistant" %}
        {%- set reasoning_content = '' %}
        {%- if message.reasoning_content is string %}
            {%- set reasoning_content = message.reasoning_content %}
        {%- else %}
            {%- if '</think>' in content %}
                {%- set reasoning_content = content.split('</think>')[0].rstrip('\n').split('<think>')[-1].lstrip('\n') %}
                {%- set content = content.split('</think>')[-1].lstrip('\n') %}
            {%- endif %}
        {%- endif %}
        {%- if loop.index0 > ns.last_query_index %}
            {%- if loop.last or (not loop.last and reasoning_content) %}
                {{- '<|im_start|>' + message.role + '\n<think>\n' + reasoning_content.strip('\n') + '\n</think>\n\n' + content.lstrip('\n') }}
            {%- else %}
                {{- '<|im_start|>' + message.role + '\n' + content }}
            {%- endif %}
        {%- else %}
            {{- '<|im_start|>' + message.role + '\n' + content }}
        {%- endif %}
        {%- if message.tool_calls %}
            {%- for tool_call in message.tool_calls %}
                {%- if (loop.first and content) or (not loop.first) %}
                    {{- '\n' }}
                {%- endif %}
                {%- if tool_call.function %}
                    {%- set tool_call = tool_call.function %}
                {%- endif %}
                {{- '<tool_call>\n{"name": "' }}
                {{- tool_call.name }}
                {{- '", "arguments": ' }}
                {%- if tool_call.arguments is string %}
                    {{- tool_call.arguments }}
                {%- else %}
                    {{- tool_call.arguments | tojson }}
                {%- endif %}
                {{- '}\n</tool_call>' }}
            {%- endfor %}
        {%- endif %}
        {{- '<|im_end|>\n' }}
    {%- elif message.role == "tool" %}
        {%- if loop.first or (messages[loop.index0 - 1].role != "tool") %}
            {{- '<|im_start|>user' }}
        {%- endif %}
        {{- '\n<tool_response>\n' }}
        {{- content }}
        {{- '\n</tool_response>' }}
        {%- if loop.last or (messages[loop.index0 + 1].role != "tool") %}
            {{- '<|im_end|>\n' }}
        {%- endif %}
    {%- endif %}
{%- endfor %}
{%- if add_generation_prompt %}
    {{- '<|im_start|>assistant\n' }}
    {%- if enable_thinking is defined and enable_thinking is false %}
        {{- '<think>\n\n</think>\n\n' }}
    {%- endif %}
{%- endif %}
`

async function loadmodel(
  modelname: string,
  category: MODEL_CATEGORY,
  onworking: (message: string) => void,
) {
  function progress_callback(info: ProgressInfo) {
    switch (info.status) {
      case 'initiate':
        onworking(`${info.name} ${info.file} loading ...`)
        break
      case 'download':
        onworking(`${info.file} downloading ...`)
        break
      case 'progress':
        onworking(`${info.file} ${Math.round(info.progress)} ...`)
        break
    }
  }

  const tokenizer = await AutoTokenizer.from_pretrained(modelname, {
    progress_callback,
  })

  const dtype = 'q4'
  const device = 'webgpu'
  switch (category) {
    case 'causal': {
      const model = await AutoModelForCausalLM.from_pretrained(modelname, {
        dtype,
        device,
        progress_callback,
      })
      return { tokenizer, model }
    }
    case 'seq2seq': {
      const model = await AutoModelForSeq2SeqLM.from_pretrained(modelname, {
        dtype,
        device,
        progress_callback,
      })
      return { tokenizer, model }
    }
    default:
      throw new Error(`Unknown model category: ${category as string}`)
  }
}

export async function createmodelcaller(
  modelname: string,
  category: MODEL_CATEGORY,
  onworking: (message: string) => void,
) {
  const { tokenizer, model } = await loadmodel(modelname, category, onworking)
  return {
    async call(messages: Message[]) {
      const tools = [
        {
          type: 'function',
          function: {
            name: 'get_current_time',
            description: 'Get the current time',
            parameters: {
              type: 'object',
              properties: {
                format: {
                  type: 'string',
                  description: 'The format of the time',
                },
              },
              required: ['format'],
            },
          },
        },
      ]

      console.info(
        tokenizer.apply_chat_template(messages, {
          tools,
          tokenize: false,
          return_dict: false,
          add_generation_prompt: true,
          // chat_template: CHAT_TEMPLATE,
        }),
      )

      const inputs = tokenizer.apply_chat_template(messages, {
        tools,
        return_dict: true,
        add_generation_prompt: true,
        // chat_template: CHAT_TEMPLATE,
      })
      if (typeof inputs !== 'object') {
        throw new Error('apply_chat_template returned unexpected type')
      }

      const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: false,
        callback_function() {
          onworking(`working ...`)
        },
      })

      onworking(`starting work ...`)
      const output = await model.generate({
        ...inputs,
        streamer,
        do_sample: false,
        max_new_tokens: 512,
      } as any)

      const decoded = tokenizer.decode(
        // @ts-expect-error yes it's complicated
        output.slice(0, [inputs.input_ids.dims[1], null]),
        { skip_special_tokens: true },
      )

      return decoded
    },
    destroy() {
      void model.dispose()
    },
  }
}

export type MODEL_CALLER = Awaited<ReturnType<typeof createmodelcaller>>
