import { webservice } from './decorators/webservice.decorator';
import { crud } from './decorators/crud.decorator';
import { WebserviceDecoratorOptions, CrudDecoratorOptions } from './decorator.options';

const serviceOptions: WebserviceDecoratorOptions = {
  enabled: true,
  options: { port: 3000 }
};

const sendEmailCrudOptions: CrudDecoratorOptions = {
  endpoint: '/email',
  method: 'POST'
};

@webservice(serviceOptions)
export class EmailService {
  constructor() {
    console.log('EmailService instantiated');
  }

  @crud(sendEmailCrudOptions)
  sendEmail(to: string, subject: string, body: string) {
    console.log(`Sending email to ${to} with subject ${subject}`);
    return { status: 'Email sent', to, subject };
  }

  // Another method without CRUD to ensure it's not picked up by mistake
  helperMethod() {
    console.log('Helper method called');
  }
}
