/**
 * Enum representing the types of parameters that can be injected into handler methods.
 * These types are used by decorators to identify the source and nature of the data
 * to be provided to a method's parameter.
 */
export enum ParameterType {
  /**
   * Represents the body of a request, typically used in POST, PUT, PATCH methods.
   * Example: @Body() data: MyDto
   */
  BODY = 'BODY',

  /**
   * Represents a context object, which can hold request-specific or application-wide information.
   * Example: @Ctx() context: IAppContext
   */
  CTX = 'CTX',

  /**
   * Represents query parameters from a URL.
   * Example: @Query('id') userId: string
   */
  QUERY = 'QUERY',

  /**
   * Represents a single URL path parameter.
   * Example: @Param('id') itemId: string (for a route like /items/:id)
   */
  PARAM = 'PARAM',

  /**
   * Represents multiple parameters, often used for CLI arguments or a collection of URL parameters.
   * For CLI, this could represent parsed flags/options.
   * Example: @Params() options: CliOptions
   */
  PARAMS = 'PARAMS',

  /**
   * Represents request headers.
   * Example: @Headers('Authorization') token: string
   */
  HEADERS = 'HEADERS',

  /**
   * Represents cookies sent with a request.
   * Example: @Cookies('sessionId') sessionId: string
   */
  COOKIES = 'COOKIES',

  /**
   * Represents session data associated with a request.
   * Example: @Session() userSession: UserSessionData
   */
  SESSION = 'SESSION',

  /**
   * Represents uploaded files, typically in a multipart/form-data request.
   * Example: @Files('avatar') avatar: UploadedFile
   */
  FILES = 'FILES',

  /**
   * Represents the raw request object from the underlying transport layer (e.g., Express Request).
   * Example: @Request() req: Express.Request
   */
  REQUEST = 'REQUEST',

  /**
   * Represents the raw response object from the underlying transport layer (e.g., Express Response).
   * Example: @Response() res: Express.Response
   */
  RESPONSE = 'RESPONSE',
}
