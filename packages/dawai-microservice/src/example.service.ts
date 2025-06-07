import { webservice } from './decorators/webservice.decorator';
import { crud } from './decorators/crud.decorator';
import { WebserviceDecoratorOptions, CrudDecoratorOptions } from './decorator.options';

const serviceOptions: WebserviceDecoratorOptions = {
  enabled: true,
  options: {
    port: 3000,
    crud: { // Options for CRUD related settings at the webservice level
      enabled: true, // Assuming CRUD is enabled for this webservice
      options: {
        basePath: '/api/v1' // All @crud endpoints under this service will be prefixed
      }
    }
  }
};

const sendEmailCrudOptions: CrudDecoratorOptions = {
  endpoint: '/email', // Will become /api/v1/email
  method: 'POST'
};

@webservice(serviceOptions)
export class EmailService {
  constructor() {
    // console.log('EmailService instantiated for testing');
  }

  @crud(sendEmailCrudOptions)
  sendEmail(to: string, subject: string, body: string) {
    // console.log(`EmailService: Sending email to ${to} with subject ${subject}`);
    return { status: 'Email actually sent by service', to, subject }; // Modified for later tests
  }

  helperMethod() {
    // console.log('Helper method called');
  }
}
