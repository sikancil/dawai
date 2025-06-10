import { ObjectType } from "./object.util"
/**
 * Represents the type for a locale.
 * Use `false` to ignore locale.
 * Defaults to `undefined`, which uses the host environment.
 * @typedef {string[] | string | false | undefined} Locale
 */
export type Locale = string[] | string | false | undefined

/**
 * Represents the options for PascalCase.
 */
export interface PascalCaseOptions extends Options {
  mergeAmbiguousCharacters?: boolean
}

/**
 * Represents the options for the `text` utility.
 */
export interface Options {
  locale?: Locale
  split?: (value: string) => string[]
  /** @deprecated Pass `split: splitSeparateNumbers` instead. */
  separateNumbers?: boolean
  delimiter?: string
  prefixCharacters?: string
  suffixCharacters?: string
}

export class TextCase {
  // Regexps for various case formats:

  // `SPLIT_LOWER_UPPER_RE`, identify transitions from lowercase letters or digits (\p{Ll}\d) to uppercase letters (\p{Lu}).
  // This pattern is useful for detecting camelCase or similar naming conventions where a lowercase letter is followed by an uppercase letter.
  static SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu

  // `SPLIT_UPPER_UPPER_RE`, targets transitions within sequences of uppercase letters.
  // Specifically, it looks for an uppercase letter (\p{Lu}) followed by another uppercase letter and a lowercase letter ([\p{Lu}][\p{Ll}]).
  // This pattern helps in identifying boundaries in PascalCase or similar formats where uppercase letters are used at the start of words.
  static SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu

  // `DEFAULT_STRIP_REGEXP`, used to strip non-word characters from a string.
  // It matches any character that is not a letter (\p{L}) or a digit (\d) and replaces it.
  // The giu flags indicate that the pattern should be applied globally (g), case-insensitively (i),
  // and treat the string as a sequence of Unicode code points (u).
  static DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu

  // `SPLIT_REPLACE_VALUE`, used as the replacement value in the splitting process.
  // It inserts a null character (\0) between the matched groups, effectively marking the split points in the string.
  static SPLIT_REPLACE_VALUE = "$1\0$2"

  // `SPLIT_SEPARATE_NUMBER_RE`, used to further process the initial split result by separating numbers from letters.
  // It matches either a digit followed by a lowercase letter ((\d)\p{Ll}) or a letter followed by a digit ((\p{L})\d).
  // This helps in handling cases where numbers and letters are adjacent in the string.
  static SPLIT_SEPARATE_NUMBER_RE = /(\d)\p{Ll}|(\p{L})\d/u

  // `DEFAULT_PREFIX_SUFFIX_CHARACTERS`, a constant that defines the default characters to keep after transforming the case of a string.
  // In this snippet, it is set to an empty string, indicating that no additional characters are preserved by default.
  static DEFAULT_PREFIX_SUFFIX_CHARACTERS = ""

  /**
   * Text string to array of Words.
   * Splits a string into an array of substrings based on a delimiter.
   * This method is designed to split a given input string into an array of words based on specific patterns and delimiters.
   * @param value - The string to be split.
   * @returns An array of substrings.
   */
  static split(value: string) {
    let result = value.trim()
    result = result
      .replace(TextCase.SPLIT_LOWER_UPPER_RE, TextCase.SPLIT_REPLACE_VALUE)
      .replace(TextCase.SPLIT_UPPER_UPPER_RE, TextCase.SPLIT_REPLACE_VALUE)
    result = result.replace(TextCase.DEFAULT_STRIP_REGEXP, "\0")
    let start = 0
    let end = result.length
    // Trim the delimiter from around the output string.
    while (result.charAt(start) === "\0") start++
    if (start === end) return []
    while (result.charAt(end - 1) === "\0") end--
    return result.slice(start, end).split(/\0/g)
  }

  /**
   * Text string to array of Words with Numbers.
   * Splits a string into separate words and numbers.
   * This method is designed to process a string by splitting it into an array of words and further separating any numbers within those words.
   * It calling method `split()` on the input value. This split method returns an array of words derived from the input string,
   * with specific delimiters and patterns applied to ensure proper segmentation.
   * @param value - The string to split.
   * @returns An array of words and numbers.
   */
  static splitSeparateNumbers(value: string) {
    const words = this.split(value)
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const match = TextCase.SPLIT_SEPARATE_NUMBER_RE.exec(word)
      if (match) {
        const offset = match.index + (match[1] ?? match[2]).length
        words.splice(i, 1, word.slice(0, offset), word.slice(offset))
      }
    }
    return words
  }

  /**
   * Splitting Prefix and Suffix.
   * Splits the input string into prefix, split, and suffix parts based on the given options.
   * This method is designed to split a given input string into three parts: a prefix, a main body, and a suffix.
   * This method takes two parameters: input, which is the string to be processed, and options, an object that
   * can contain various optional settings to customize the behavior of the function.
   * @param input - The input string to be split.
   * @param options - The options for splitting the string (optional).
   * @returns An array containing the prefix, split, and suffix parts of the input string.
   */
  static splitPrefixSuffix(input: string, options: Options = {}) {
    const splitFn = options.split ?? this.splitSeparateNumbers ?? this.split
    const prefixCharacters = options.prefixCharacters ?? TextCase.DEFAULT_PREFIX_SUFFIX_CHARACTERS
    const suffixCharacters = options.suffixCharacters ?? TextCase.DEFAULT_PREFIX_SUFFIX_CHARACTERS
    let prefixIndex = 0
    let suffixIndex = input.length
    while (prefixIndex < input.length) {
      const char = input.charAt(prefixIndex)
      if (!prefixCharacters.includes(char)) break
      prefixIndex++
    }
    while (suffixIndex > prefixIndex) {
      const index = suffixIndex - 1
      const char = input.charAt(index)
      if (!suffixCharacters.includes(char)) break
      suffixIndex = index
    }
    // return [input.slice(0, prefixIndex), splitFn(input.slice(prefixIndex, suffixIndex)), input.slice(suffixIndex)]
    // const prefix = prefixCharacters === "" ? "" : input.slice(0, prefixIndex)
    // const suffix = suffixCharacters === "" ? "" : input.slice(suffixIndex)
    const prefix = input.slice(0, prefixIndex)
    const suffix = input.slice(suffixIndex)
    const middle = input.slice(prefixIndex, suffixIndex)
    return [prefix, splitFn.call(TextCase, middle), suffix]
  }

  /**
   * Text lowering case.
   * This method is designed to create and return a function that converts a given string to lowercase.
   * The behavior of the returned function depends on the locale parameter, which can be of type Locale.
   * The Locale type can be an array of strings, a single string, false, or undefined.
   * If the locale is set to false, the function converts the input string to lowercase using the default locale.
   * Returns a function that converts the input string to lowercase based on the specified locale.
   * @param locale - The locale used for converting the input string to lowercase. Set to false to use the default locale.
   * @returns A function that converts the input string to lowercase based on the specified locale.
   */
  static lowerFactory(locale: Locale) {
    return locale === false ? (input: string) => input.toLowerCase() : (input: string) => input.toLocaleLowerCase(locale)
  }

  /**
   * Text uppering case.
   * This method is designed to create and return a function that converts a given string to uppercase.
   * The behavior of the returned function depends on the locale parameter, which can be of type Locale.
   * The Locale type can be an array of strings, a single string, false, or undefined.
   * If the locale is set to false, the function converts the string to uppercase using the default locale.
   * If the locale is provided, the function converts the string to uppercase using the specified locale.
   * Returns a function that converts a string to uppercase based on the specified locale.
   * @param locale - The locale to use for uppercase conversion. Set to false to use the default locale.
   * @returns A function that converts a string to uppercase based on the specified locale.
   */
  static upperFactory(locale: Locale) {
    return locale === false ? (input: string) => input.toUpperCase() : (input: string) => input.toLocaleUpperCase(locale)
  }

  /**
   * Capital Case Transform Factory.
   * Factory function that creates a transform function for capitalizing the first letter of a word.
   * This designed to create and return a function that transforms a given word into capital case.
   * Capital case typically means that the first letter of the word is uppercase, while the rest of the letters are lowercase.
   * @param lower - A function that takes a string as input and returns a string. Expected to convert the input string to lowercase.
   * @param upper - A function that takes a string as input and returns a string. Expected to convert the input string to uppercase.
   * @returns A transform function that capitalizes the first letter of a word.
   */
  static capitalCaseTransformFactory(lower: (input: string) => string, upper: (input: string) => string) {
    return (word: string) => `${upper(word[0])}${lower(word.slice(1))}`
  }

  /**
   * Pascal Case Transform Factory.
   * Factory function that creates a transform function for converting words to PascalCase.
   * This designed to create and return a function that transforms a given word into PascalCase.
   * PascalCase is a naming convention where the first letter of each word is capitalized, and there are no spaces or underscores between words.
   * @param lower - A function that takes a string as input and returns a string. Expected to convert the input string to lowercase.
   * @param upper - A function that takes a string as input and returns a string. Expected to convert the input string to uppercase.
   * @returns A transform function that converts words to PascalCase.
   */
  static pascalCaseTransformFactory(lower: (input: string) => string, upper: (input: string) => string) {
    return (word: string, index: number) => {
      const char0 = word[0]
      const initial = index > 0 && char0 >= "0" && char0 <= "9" ? "_" + char0 : upper(char0)
      return initial + lower(word.slice(1))
    }
  }

  /**
   * Capital Case.
   * Converts a string to capital case. This designed to transform a given input string into capital case format.
   * Capital case typically means that the first letter of each word is uppercase, while the rest of the letters are lowercase.
   * This method also allows for various customization options through the options parameter.
   * @param input - The input string to convert.
   * @param options - The options for the conversion.
   * @returns The input string converted to capital case.
   */
  static capitalCase(input: string, options: Options = {}) {
    const [prefix, words, suffix] = this.splitPrefixSuffix(input, options)
    const lower = this.lowerFactory(options?.locale)
    const upper = this.upperFactory(options?.locale)
    return prefix + (words as string[]).map(this.capitalCaseTransformFactory(lower, upper)).join(options?.delimiter ?? " ") + suffix
  }

  /**
   * No Case.
   * Converts a string to a no-case format. This designed to transform a given input string into a format where
   * all characters are lowercase and words are separated by a specified delimiter.
   * This method is particularly useful for converting strings into a more readable, normalized format without any uppercase letters.
   * @param input - The input string to convert.
   * @param options - The options for the conversion.
   * @returns The converted string in a no-case format.
   */
  static noCase(input: string, options?: Options): string {
    const [prefix, words, suffix] = this.splitPrefixSuffix(
      input,
      ObjectType.applyIf({ separateNumbers: true }, options),
    )
    return prefix + (words as string[]).map(this.lowerFactory(options?.locale)).join(options?.delimiter ?? " ") + suffix
  }

  // Kebab Case,
  // designed to transform a given input string into kebab-case format.
  // Kebab-case is a string format where words are all lowercase and separated by hyphens (-).
  // This format is commonly used in URLs and CSS class names.
  /**
   * Kebab Case.
   * Converts a string to kebab case. This designed to transform a given input string into kebab-case format.
   * Kebab-case is a string format where all words are in lowercase and separated by hyphens (-).
   * This format is commonly used in URLs and CSS class names.
   * @param input - The input string to convert.
   * @param options - Optional options for the conversion.
   * @returns The kebab case version of the input string.
   */
  static kebabCase(input: string, options?: Options) {
    return this.noCase(input, ObjectType.applyIf({ delimiter: "-", separateNumbers: true }, options))
  }

  /**
   * Train Case.
   * Converts a string to train case. This designed to transform a given input string into train-case format.
   * Train-case is a string format where each word is capitalized and words are separated by hyphens (-).
   * This format is similar to kebab-case but with the added feature of capitalizing the first letter of each word.
   * @param input - The input string that needs to be transformed.
   * @param options - An optional object of type Options that allows for customization of the transformation process.
   * @returns The converted train case string.
   */
  static trainCase(input: string, options?: Options): string {
    return this.capitalCase(input, ObjectType.applyIf({ delimiter: "-", separateNumbers: true }, options))
  }

  /**
   * Camel Case.
   * Converts a string to camel case. This designed to transform a given input string into camelCase format.
   * CamelCase is a string format where the first word is in lowercase and each subsequent word starts with an uppercase letter,
   * with no spaces or delimiters between words.
   * @param input - The input string that needs to be transformed.
   * @param options - An optional object of type PascalCaseOptions that allows for customization of the transformation process.
   * @returns The camel case version of the input string.
   */
  static camelCase(input: string, options?: PascalCaseOptions): string {
    const [prefix, words, suffix] = this.splitPrefixSuffix(input, options)
    const lower = this.lowerFactory(options?.locale)
    const upper = this.upperFactory(options?.locale)
    const transform = options?.mergeAmbiguousCharacters
      ? this.capitalCaseTransformFactory(lower, upper)
      : this.pascalCaseTransformFactory(lower, upper)
    return (
      prefix +
      (words as string[])
        .map((word: string, index: number) => {
          if (index === 0) return lower(word)
          return transform(word, index)
        })
        .join(options?.delimiter ?? "") +
      suffix
    )
  }

  /**
   * Pascal Case.
   * Converts a string to PascalCase. This designed to transform a given input string into PascalCase format.
   * PascalCase is a string format where each word starts with an uppercase letter, and there are no spaces or delimiters between words.
   * This format is commonly used in programming for naming classes and other identifiers.
   * @param input - The input string that needs to be transformed.
   * @param options - An optional object of type PascalCaseOptions that allows for customization of the transformation process.
   *                  This object can include properties like locale for locale-specific transformations, and
   *                  `mergeAmbiguousCharacters` to handle ambiguous character merging.
   * @returns The converted string in PascalCase.
   */
  static pascalCase(input: string, options?: PascalCaseOptions): string {
    const [prefix, words, suffix] = this.splitPrefixSuffix(input, options)
    const lower = this.lowerFactory(options?.locale)
    const upper = this.upperFactory(options?.locale)
    const transform = options?.mergeAmbiguousCharacters
      ? this.capitalCaseTransformFactory(lower, upper)
      : this.pascalCaseTransformFactory(lower, upper)
    return prefix + (words as string[]).map(transform).join(options?.delimiter ?? "") + suffix
  }

  /**
   * Pascal Snake Case.
   * Converts a string from PascalCase to snake_case. This designed to transform a given input string into PascalSnakeCase format.
   * PascalSnakeCase is a string format where each word starts with an uppercase letter, and words are separated by underscores (_).
   * This format is useful in various programming contexts, especially when dealing with identifiers that need to be both readable and distinct.
   * @param input - The input string that needs to be transformed.
   * @param options - An optional object of type Options that allows for customization of the transformation process.
   *                  This object can include properties like locale for locale-specific transformations,
   *                  split for custom word splitting, delimiter for specifying the delimiter between words, and other options.
   * @returns The converted string in snake_case.
   */
  static pascalSnakeCase(input: string, options?: Options): string {
    return this.capitalCase(input, ObjectType.applyIf({ delimiter: "_" }, options))
  }

  /**
   * Constant Case.
   * Converts a string to constant case. This designed to transform a given input string into CONSTANT_CASE format.
   * CONSTANT_CASE is a string format where all letters are uppercase, and words are separated by underscores (_).
   * This format is commonly used for naming constants in programming.
   * @param input - The input string that needs to be transformed.
   * @param options - An optional object of type Options that allows for customization of the transformation process.
   *                  This object can include properties like locale for locale-specific transformations, split for custom word splitting,
   *                  delimiter for specifying the delimiter between words, and prefixCharacters and suffixCharacters for handling
   *                  special characters at the beginning and end of the string.
   * @returns The converted string in constant case.
   */
  static constantCase(input: string, options?: Options): string {
    const [prefix, words, suffix] = this.splitPrefixSuffix(input, options)
    return prefix + (words as string[]).map(this.upperFactory(options?.locale)).join(options?.delimiter ?? "_") + suffix
  }

  /**
   * Dot Case.
   * Converts a string to dot case. This designed to transform a given input string into dot.case format.
   * Dot.case is a string format where words are separated by dots (.), making it useful for certain naming conventions or readability purposes in programming.
   * @param input - The input string that needs to be transformed.
   * @param options - An optional object of type `Options` that allows for customization of the transformation process.
   *                  This object can include properties like locale for locale-specific transformations, split for custom word splitting,
   *                  delimiter for specifying the delimiter between words, and other options.
   * @returns The dot case representation of the input string.
   */
  static dotCase(input: string, options?: Options): string {
    return this.noCase(input, ObjectType.applyIf({ delimiter: "." }, options))
  }

  /**
   * Path Case
   * Converts a string to path case. This designed to transform a given input string into a path-like format, where words are separated by forward slashes (/).
   * This format is commonly used for file paths or URLs, making it useful in various programming contexts.
   * @param input - The input string that needs to be transformed.
   * @param options - An optional object of type `Options` that allows for customization of the transformation process.
   *                  This object can include properties like locale for locale-specific transformations, split for custom word splitting,
   *                  delimiter for specifying the delimiter between words, and other options.
   * @returns The converted string in path case.
   */
  static pathCase(input: string, options?: Options) {
    return this.noCase(input, ObjectType.applyIf({ delimiter: "/" }, options))
  }

  /**
   * Sentence Case.
   * Converts a string to sentence case. This designed to transform a given input string into sentence case format.
   * Sentence case typically means that the first letter of the first word is capitalized, while the rest of the words are in lowercase.
   * This method provides flexibility by allowing customization through an optional options parameter.
   * @param input - The input string that needs to be transformed.
   * @param options - Optional parameters for customization.
   * @returns The input string converted to sentence case.
   */
  static sentenceCase(input: string, options?: Options): string {
    const [prefix, words, suffix] = this.splitPrefixSuffix(
      input,
      ObjectType.applyIf({ separateNumbers: true }, options),
    )
    const lower = this.lowerFactory(options?.locale)
    const upper = this.upperFactory(options?.locale)
    const transform = this.capitalCaseTransformFactory(lower, upper)
    return (
      prefix +
      (words as string[])
        .map((word: string, index: number) => {
          if (index === 0) return transform(word)
          return lower(word)
        })
        .join(options?.delimiter ?? " ") +
      suffix
    )
  }

  /**
   * Snake Case.
   * Converts a string to snake case. This designed to transform a given input string into snake_case format.
   * In snake_case, words are typically separated by underscores (_), and all letters are in lowercase.
   * This format is commonly used in programming for variable names, file names, and other identifiers.
   * @param input - The input string that needs to be transformed.
   * @param options - An optional object of type `Options` that allows for customization of the transformation process.
   *                  This object can include properties like locale for locale-specific transformations, split for custom word splitting,
   *                  delimiter for specifying the delimiter between words, and other options.
   * @returns The snake cased string.
   */
  static snakeCase(input: string, options?: Options): string {
    return this.noCase(input, ObjectType.applyIf({ delimiter: "_", separateNumbers: true }, options))
  }
}
