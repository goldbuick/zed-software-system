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

  const dtype = 'q4f16'
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

const MODEL_ID = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'
const MODEL_MODE = 'causal'
const MODEL_CHAT_TEMPLATE = `{# ───── header (system message) ───── #}
{{- "<|im_start|>system\n" -}}
{%- if messages[0].role == "system" -%}
  {%- set system_message = messages[0].content -%}
  {%- set custom_instructions = system_message.rstrip() -%}
{%- endif -%}
{%- if "/system_override" in system_message -%}
  {{- custom_instructions.replace("/system_override", "").rstrip() -}}
  {{- "<|im_end|>\n" -}}
{%- else -%}
  {{- "## Metadata\n\n" -}}
  {{- "Knowledge Cutoff Date: June 2025\n" -}}
  {%- set today = strftime_now("%d %B %Y") -%}
  {{- "Today Date: " ~ today ~ "\n\n" -}}
  {{- "## Custom Instructions\n\n" -}}
  {%- if custom_instructions -%}
    {{- custom_instructions + "\n\n" -}}
  {%- else -%}
    {{- "You are a helpful AI assistant running in a simulation.\n\n" -}}
  {%- endif -%}
  {%- if tools -%}
    {{- "### Tools\n\n" -}}
    {%- set ns = namespace(xml_tool_string="You may call one or more functions to assist with the user query.\nYou are provided with function signatures within <tools></tools> XML tags:\n\n<tools>\n") -%}
    {%- for tool in tools[:] -%} {# The slicing makes sure that tools is a list #}
      {%- set ns.xml_tool_string = ns.xml_tool_string ~ (tool | tojson) ~ "\n" -%}
    {%- endfor -%}
    {%- set xml_tool_string = ns.xml_tool_string + "</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{\\"name\\": <function-name>, \\"arguments\\": <args-json-object>}\n</tool_call>" -%}
    {{- xml_tool_string -}}
    {{- "\n\n" -}}
    {{- "<|im_end|>\n" -}}
  {%- endif -%}
{%- endif -%}
{# ───── main loop ───── #}
{%- for message in messages -%}
    {%- set content = message.content if message.content is string else "" -%}
    {%- if message.role == "user" -%}
        {{ "<|im_start|>" + message.role + "\n"  + content + "<|im_end|>\n" }}
    {%- elif message.role == "assistant" -%}
        {% generation %}
          {{ "<|im_start|>assistant\n" + content.lstrip("\n") + "<|im_end|>\n" }}
        {% endgeneration %}
    {%- elif message.role == "tool" -%}
        {{ "<|im_start|>" + "tool\n"  + content + "<|im_end|>\n" }}
    {%- endif -%}
{%- endfor -%}
{# ───── generation prompt ───── #}
{%- if add_generation_prompt -%}
    {{ "<|im_start|>assistant\n" }}
{%- endif -%}
`

const MODEL_SYSTEM_PROMPT = `
You are a non-player character in a video game.
Give yourself a name and describe your personality.
Help the player by answering questions and providing information.

## Response Types
- Text answer: Answer the question directly.
- Tool call: Call a tool to help the player.
`

const MODEL_TOOLS = [
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

export async function createmodelcaller(onworking: (message: string) => void) {
  const { tokenizer, model } = await loadmodel(MODEL_ID, MODEL_MODE, onworking)
  return {
    async call(messages: Message[]) {
      const convo = [
        {
          role: 'system',
          content: MODEL_SYSTEM_PROMPT,
        },
        ...messages,
      ]

      const generateoptions = {
        chat_template: MODEL_CHAT_TEMPLATE,
        tools: MODEL_TOOLS,
        add_generation_prompt: true,
      }

      console.info(
        tokenizer.apply_chat_template(convo, {
          ...generateoptions,
          tokenize: false,
        }),
      )

      const inputs = tokenizer.apply_chat_template(convo, {
        ...generateoptions,
        tokenize: true,
        return_dict: true,
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
        max_new_tokens: 256,
        num_return_sequences: 1,
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
