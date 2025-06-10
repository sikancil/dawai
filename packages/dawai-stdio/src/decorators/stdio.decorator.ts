import { StdioOptions } from '@arifwidianto/dawai-common';
import { TRANSPORT_TYPE_METADATA, TransportType, CLASS_DECORATOR_OPTIONS_METADATA } from '@arifwidianto/dawai-common';

/**
 * Class decorator to enable and configure STDIO transport.
 * @param options Configuration for STDIO.
 */
export function stdio(options?: StdioOptions): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(TRANSPORT_TYPE_METADATA, TransportType.STDIO, target);
    if (options) {
      Reflect.defineMetadata(CLASS_DECORATOR_OPTIONS_METADATA, options, target);
    }
  };
}
