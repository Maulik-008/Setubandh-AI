import { Module } from '@nestjs/common';
import { ExampleModule } from './modules/example';

/** Root module of the worker app. Feature modules are added here as tickets land. */
@Module({ imports: [ExampleModule] })
export class AppModule {}
