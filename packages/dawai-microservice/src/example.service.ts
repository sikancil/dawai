import { webservice } from './decorators/webservice.decorator';
import { crud } from './decorators/crud.decorator';
import { WebserviceDecoratorOptions, CrudDecoratorOptions } from './decorator.options';
import { Body } from './decorators/body.decorator';
import { Params } from './decorators/params.decorator';
import { Query } from './decorators/query.decorator';

const serviceOptions: WebserviceDecoratorOptions = {
  enabled: true,
  options: {
    port: 3000,
    crud: {
      enabled: true,
      options: {
        basePath: '/api/v1'
      }
    }
  }
};

// Updated CRUD options to include a path parameter
const sendEmailCrudOptions: CrudDecoratorOptions = {
  endpoint: '/email/:userId', // Path parameter :userId
  method: 'POST'
};

@webservice(serviceOptions)
export class EmailService {
  constructor() {
    // console.log('EmailService instantiated for testing with params');
  }

  @crud(sendEmailCrudOptions)
  sendEmail(
    @Params('userId') userId: string,
    @Query('sendConfirmation') sendConfirmation: string, // query params are strings by default from Express
    @Body() payload: { to: string; subject: string; bodyContent: string }
  ) {
    // console.log(`EmailService: Invoked sendEmail with userId: ${userId}, sendConfirmation: ${sendConfirmation}, payload:`, payload);
    return {
      status: 'Email processed by service',
      userIdReceived: userId,
      confirmationRequested: sendConfirmation === 'true', // Convert string "true" to boolean
      toAddress: payload?.to,
      emailSubject: payload?.subject,
      bodyReceived: payload?.bodyContent
    };
  }

  helperMethod() {
    // console.log('Helper method called');
  }
}
