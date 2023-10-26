import {
  BaseStringPromptTemplate,
  BasePromptTemplateInput,
  BaseExampleSelector,
  TypedPromptInputValues,
} from "./base.js";
import {
  TemplateFormat,
  checkValidTemplate,
  renderTemplate,
} from "./template.js";
import { PromptTemplate } from "./prompt.js";
import { SerializedFewShotTemplate } from "./serde.js";
import {
  BaseMessage,
  Example,
  InputValues,
  PartialValues,
} from "../schema/index.js";
import { BaseChatPromptTemplate, BaseMessagePromptTemplate } from "./chat.js";

export interface FewShotPromptTemplateInput
  extends BasePromptTemplateInput<InputValues> {
  /**
   * Examples to format into the prompt. Exactly one of this or
   * {@link exampleSelector} must be
   * provided.
   */
  examples?: Example[];

  /**
   * An {@link BaseExampleSelector} Examples to format into the prompt. Exactly one of this or
   * {@link examples} must be
   * provided.
   */
  exampleSelector?: BaseExampleSelector;

  /**
   * An {@link PromptTemplate} used to format a single example.
   */
  examplePrompt: PromptTemplate;

  /**
   * String separator used to join the prefix, the examples, and suffix.
   */
  exampleSeparator?: string;

  /**
   * A prompt template string to put before the examples.
   *
   * @defaultValue `""`
   */
  prefix?: string;

  /**
   * A prompt template string to put after the examples.
   */
  suffix?: string;

  /**
   * The format of the prompt template. Options are: 'f-string'
   */
  templateFormat?: TemplateFormat;

  /**
   * Whether or not to try validating the template on initialization.
   */
  validateTemplate?: boolean;
}

/**
 * Prompt template that contains few-shot examples.
 * @augments BasePromptTemplate
 * @augments FewShotPromptTemplateInput
 */
export class FewShotPromptTemplate
  extends BaseStringPromptTemplate
  implements FewShotPromptTemplateInput
{
  lc_serializable = false;

  examples?: InputValues[];

  exampleSelector?: BaseExampleSelector | undefined;

  examplePrompt: PromptTemplate;

  suffix = "";

  exampleSeparator = "\n\n";

  prefix = "";

  templateFormat: TemplateFormat = "f-string";

  validateTemplate = true;

  constructor(input: FewShotPromptTemplateInput) {
    super(input);
    Object.assign(this, input);

    if (this.examples !== undefined && this.exampleSelector !== undefined) {
      throw new Error(
        "Only one of 'examples' and 'example_selector' should be provided"
      );
    }

    if (this.examples === undefined && this.exampleSelector === undefined) {
      throw new Error(
        "One of 'examples' and 'example_selector' should be provided"
      );
    }

    if (this.validateTemplate) {
      let totalInputVariables: string[] = this.inputVariables;
      if (this.partialVariables) {
        totalInputVariables = totalInputVariables.concat(
          Object.keys(this.partialVariables)
        );
      }
      checkValidTemplate(
        this.prefix + this.suffix,
        this.templateFormat,
        totalInputVariables
      );
    }
  }

  _getPromptType(): "few_shot" {
    return "few_shot";
  }

  private async getExamples(
    inputVariables: InputValues
  ): Promise<InputValues[]> {
    if (this.examples !== undefined) {
      return this.examples;
    }
    if (this.exampleSelector !== undefined) {
      return this.exampleSelector.selectExamples(inputVariables);
    }

    throw new Error(
      "One of 'examples' and 'example_selector' should be provided"
    );
  }

  async partial<NewPartialVariableName extends string>(
    values: PartialValues<NewPartialVariableName>
  ) {
    const newInputVariables = this.inputVariables.filter(
      (iv) => !(iv in values)
    );
    const newPartialVariables = {
      ...(this.partialVariables ?? {}),
      ...values,
    };
    const promptDict = {
      ...this,
      inputVariables: newInputVariables,
      partialVariables: newPartialVariables,
    };
    return new FewShotPromptTemplate(promptDict);
  }

  /**
   * Formats the prompt with the given values.
   * @param values The values to format the prompt with.
   * @returns A promise that resolves to a string representing the formatted prompt.
   */
  async format(values: InputValues): Promise<string> {
    const allValues = await this.mergePartialAndUserVariables(values);
    const examples = await this.getExamples(allValues);

    const exampleStrings = await Promise.all(
      examples.map((example) => this.examplePrompt.format(example))
    );
    const template = [this.prefix, ...exampleStrings, this.suffix].join(
      this.exampleSeparator
    );
    return renderTemplate(template, this.templateFormat, allValues);
  }

  serialize(): SerializedFewShotTemplate {
    if (this.exampleSelector || !this.examples) {
      throw new Error(
        "Serializing an example selector is not currently supported"
      );
    }
    if (this.outputParser !== undefined) {
      throw new Error(
        "Serializing an output parser is not currently supported"
      );
    }
    return {
      _type: this._getPromptType(),
      input_variables: this.inputVariables,
      example_prompt: this.examplePrompt.serialize(),
      example_separator: this.exampleSeparator,
      suffix: this.suffix,
      prefix: this.prefix,
      template_format: this.templateFormat,
      examples: this.examples,
    };
  }

  static async deserialize(
    data: SerializedFewShotTemplate
  ): Promise<FewShotPromptTemplate> {
    const { example_prompt } = data;
    if (!example_prompt) {
      throw new Error("Missing example prompt");
    }
    const examplePrompt = await PromptTemplate.deserialize(example_prompt);

    let examples: Example[];

    if (Array.isArray(data.examples)) {
      examples = data.examples;
    } else {
      throw new Error(
        "Invalid examples format. Only list or string are supported."
      );
    }

    return new FewShotPromptTemplate({
      inputVariables: data.input_variables,
      examplePrompt,
      examples,
      exampleSeparator: data.example_separator,
      prefix: data.prefix,
      suffix: data.suffix,
      templateFormat: data.template_format,
    });
  }
}

export interface FewShotChatMessagePromptTemplateInput
  extends BasePromptTemplateInput<InputValues> {
  /**
   * Examples to format into the prompt. Exactly one of this or
   * {@link exampleSelector} must be
   * provided.
   */
  examples?: Example[];

  /**
   * An {@link BaseMessagePromptTemplate} | {@link BaseChatPromptTemplate} used to format a single example.
   */
  examplePrompt: BaseMessagePromptTemplate | BaseChatPromptTemplate;

  /**
   * String separator used to join the prefix, the examples, and suffix.
   */
  exampleSeparator?: string;

  /**
   * A prompt template string to put before the examples.
   *
   * @defaultValue `""`
   */
  prefix?: string;

  /**
   * A prompt template string to put after the examples.
   */
  suffix?: string;

  /**
   * The format of the prompt template. Options are: 'f-string'
   */
  templateFormat?: TemplateFormat;

  /**
   * Whether or not to try validating the template on initialization.
   */
  validateTemplate?: boolean;
}

export class FewShotChatMessagePromptTemplate<
    RunInput extends InputValues = any,
    PartialVariableName extends string = any
  >
  extends BaseChatPromptTemplate<RunInput, PartialVariableName>
  implements FewShotChatMessagePromptTemplateInput
{
  lc_serializable = false;

  examples?: InputValues[];

  exampleSelector?: BaseExampleSelector | undefined;

  examplePrompt: BaseMessagePromptTemplate | BaseChatPromptTemplate;

  suffix = "";

  exampleSeparator = "\n\n";

  prefix = "";

  templateFormat: TemplateFormat = "f-string";

  validateTemplate = true;

  _getPromptType(): "few_shot_chat" {
    return "few_shot_chat";
  }

  constructor(fields: FewShotChatMessagePromptTemplateInput) {
    /** @TODO - broken, what da hell 🫠 */
    super(fields);
    Object.assign(this, fields);

    if (this.examples !== undefined && this.exampleSelector !== undefined) {
      throw new Error(
        "Only one of 'examples' and 'example_selector' should be provided"
      );
    }

    if (this.examples === undefined && this.exampleSelector === undefined) {
      throw new Error(
        "One of 'examples' and 'example_selector' should be provided"
      );
    }

    if (this.validateTemplate) {
      let totalInputVariables: string[] = this.inputVariables;
      if (this.partialVariables) {
        totalInputVariables = totalInputVariables.concat(
          Object.keys(this.partialVariables)
        );
      }
      checkValidTemplate(
        this.prefix + this.suffix,
        this.templateFormat,
        totalInputVariables
      );
    }
  }

  private async getExamples(
    inputVariables: InputValues
  ): Promise<InputValues[]> {
    if (this.examples !== undefined) {
      return this.examples;
    }
    if (this.exampleSelector !== undefined) {
      return this.exampleSelector.selectExamples(inputVariables);
    }

    throw new Error(
      "One of 'examples' and 'example_selector' should be provided"
    );
  }

  /**
   * Formats the list of values and returns a list of formatted messages.
   * @param values The values to format the prompt with.
   * @returns A promise that resolves to a string representing the formatted prompt.
   */
  async formatMessages(
    values: TypedPromptInputValues<RunInput>
  ): Promise<BaseMessage[]> {
    const allValues = await this.mergePartialAndUserVariables(values);
    let examples = await this.getExamples(allValues);
    examples = examples.map((example) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Record<string, any> = {};
      this.examplePrompt.inputVariables.forEach((inputVariable) => {
        result[inputVariable] = example[inputVariable];
      });
      return result;
    });

    const messages = [];
    for (const example of examples) {
      const exampleMessages = await this.examplePrompt.formatMessages(example);
      for (const message of exampleMessages) {
        messages.push(message);
      }
    }

    return messages;
  }

  async format(values: TypedPromptInputValues<RunInput>): Promise<string> {
    const allValues = await this.mergePartialAndUserVariables(values);
    const examples = await this.getExamples(allValues);

    const exampleStrings = await Promise.all(
      examples.map((example) => this.examplePrompt.formatMessages(example))
    );
    const template = [this.prefix, ...exampleStrings, this.suffix].join(
      this.exampleSeparator
    );
    return renderTemplate(template, this.templateFormat, allValues);
  }

  async partial(
    values: PartialValues<PartialVariableName>
  ): Promise<FewShotChatMessagePromptTemplate<RunInput, PartialVariableName>> {
    const newInputVariables = this.inputVariables.filter(
      (variable) => !(variable in values)
    ) as Exclude<Extract<keyof RunInput, string>, PartialVariableName>[];
    const newPartialVariables = {
      ...(this.partialVariables ?? {}),
      ...values,
    } as PartialValues<PartialVariableName | PartialVariableName>;
    const promptDict = {
      ...this,
      inputVariables: newInputVariables,
      partialVariables: newPartialVariables,
    };
    console.log("promptDict", promptDict);
    return new FewShotChatMessagePromptTemplate<
      InputValues<Exclude<Extract<keyof RunInput, string>, PartialVariableName>>
    >(promptDict);
  }
}
