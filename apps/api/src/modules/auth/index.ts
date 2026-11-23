// Public entry of the auth module.
export { AuthModule } from './auth.module';
export { AuthService } from './auth.service';
export { CurrentUser, Public, RequireVerifiedEmail, type AuthUser } from './auth.guard';
export { BREACHED_PASSWORDS, type BreachedPasswordChecker } from './breached-passwords';
