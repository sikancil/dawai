import { Microservice } from './microservice';
import { EmailService } from '../example.service';
import { TransportAdapter } from '../base/transport.adapter';
import { metadataStorage } from '../decorators/metadata.storage';

let assertionsFailed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Assertion Failed: ${message}`);
    assertionsFailed++;
  } else {
    console.log(`Assertion Passed: ${message}`);
  }
}

class MockTransportAdapter extends TransportAdapter {
  public initializedWithOptions: any = null;
  public listened: boolean = false;
  public closed: boolean = false;
  public registeredHandlers: Map<string, any> = new Map();

  async initialize(options: any): Promise<void> {
    console.log('MockTransportAdapter: Initializing with options:', options);
    this.initializedWithOptions = options;
  }
  async listen(): Promise<void> {
    console.log('MockTransportAdapter: Listening...');
    this.listened = true;
  }
  async close(): Promise<void> {
    console.log('MockTransportAdapter: Closing...');
    this.closed = true;
  }
  registerHandler(handlerName: string, metadata: any): void {
    console.log(`MockTransportAdapter: Registering handler '${handlerName}' with metadata:`, metadata);
    this.registeredHandlers.set(handlerName, metadata);
  }
}

async function runTest() {
  console.log('--- Starting Microservice Test ---');

  const mockAdapter = new MockTransportAdapter();
  const adapterOptions = { specificAdapterOption: 'testValue', port: 3000 };

  // Ensure EmailService class definition is processed by creating an instance.
  // This ensures its decorators run and populate metadataStorage.
  new EmailService();

  const microservice = new Microservice(EmailService);
  microservice.registerTransport(mockAdapter, adapterOptions);

  await microservice.bootstrap();
  await microservice.listen();

  // Assertions
  assert(mockAdapter.initializedWithOptions === adapterOptions, 'Adapter should be initialized with registered options');

  assert(mockAdapter.registeredHandlers.has('sendEmail'), "Handler 'sendEmail' should be registered");
  const sendEmailMeta = mockAdapter.registeredHandlers.get('sendEmail');
  assert(sendEmailMeta !== undefined, "Metadata for 'sendEmail' should exist");
  assert(sendEmailMeta.crud !== undefined, "'sendEmail' metadata should have 'crud' property");
  assert(sendEmailMeta.crud.endpoint === '/email', "CRUD endpoint should be '/email'");
  assert(sendEmailMeta.crud.method === 'POST', "CRUD method should be 'POST'");

  // Check that helperMethod (which is not decorated with @crud) is not registered
  assert(mockAdapter.registeredHandlers.has('helperMethod') === false, "Handler 'helperMethod' should NOT be registered as a CRUD endpoint");
  assert(mockAdapter.registeredHandlers.size === 1, 'Only one handler (sendEmail) should be registered via @crud');


  assert(mockAdapter.listened === true, 'Adapter should have been listened on');

  await microservice.close();
  assert(mockAdapter.closed === true, 'Adapter should have been closed');

  const esClassMeta = metadataStorage.getClassMetadata(EmailService);
  console.log('Direct Class Meta for EmailService from Storage:', esClassMeta);
  assert(esClassMeta !== undefined && esClassMeta.webservice !== undefined, 'Webservice metadata should exist for EmailService');
  assert(esClassMeta.webservice.options.port === 3000, 'Webservice port from metadata should be 3000');

  const esMethodMeta = metadataStorage.getAllMethodMetadata(EmailService);
  console.log('Direct Method Meta for EmailService from Storage:', esMethodMeta);
  assert(esMethodMeta?.get('sendEmail')?.crud?.endpoint === '/email', 'CRUD endpoint from direct metadata check');


  if (assertionsFailed > 0) {
    console.error(`--- TEST FAILED: ${assertionsFailed} assertions failed. ---`);
    process.exit(1); // Indicate failure
  } else {
    console.log('--- TEST PASSED ---');
  }
}

runTest().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
