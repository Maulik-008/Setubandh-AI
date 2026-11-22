import { Injectable } from '@nestjs/common';

/** Placeholder module that proves the module layout and boundary rule. Removed when real modules land. */
@Injectable()
export class ExampleService {
  describe(): string {
    return 'worker example module';
  }
}
