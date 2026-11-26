import { LinkProvider } from '@astryxdesign/core/Link';
import { forwardRef, type ComponentProps } from 'react';
import { Link as RouterLink, Outlet, ScrollRestoration, type RouteObject } from 'react-router';
import { RedirectIfSignedIn, RequireAuth } from '../auth/guards';
import { AuthLayout } from '../pages/auth/AuthLayout';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteError } from '../pages/RouteError';
import { AppLayout } from '../shell/AppLayout';

/** Astryx links and link-buttons navigate through React Router (no full page loads). */
const AppLink = forwardRef<HTMLAnchorElement, ComponentProps<'a'> & { to?: string }>(
  function AppLink({ to, href, ...props }, ref) {
    const target = to ?? href ?? '/';
    // External and protocol links stay plain anchors.
    if (/^[a-z]+:/i.test(target)) return <a ref={ref} href={target} {...props} />;
    return <RouterLink ref={ref} to={target} {...props} />;
  },
);

function Root() {
  return (
    <LinkProvider component={AppLink}>
      <ScrollRestoration />
      <Outlet />
    </LinkProvider>
  );
}

/** Lazy route: each screen is its own chunk (requirements §13.2). */
const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => ({
  lazy: async () => ({ Component: (await load())[name] }),
});

/** Every screen and every tab has a URL (M1-13 AC). */
export const routes: RouteObject[] = [
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      {
        element: <RedirectIfSignedIn />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: 'login', ...page(() => import('../pages/auth/LoginPage'), 'LoginPage') },
              { path: 'signup', ...page(() => import('../pages/auth/SignupPage'), 'SignupPage') },
              { path: 'forgot', ...page(() => import('../pages/auth/ForgotPage'), 'ForgotPage') },
              {
                path: '2fa',
                ...page(() => import('../pages/auth/TwoFactorPage'), 'TwoFactorPage'),
              },
            ],
          },
        ],
      },
      {
        // Links from emails work signed in or out.
        element: <AuthLayout />,
        children: [
          { path: 'verify', ...page(() => import('../pages/auth/VerifyPage'), 'VerifyPage') },
          { path: 'reset', ...page(() => import('../pages/auth/ResetPage'), 'ResetPage') },
          { path: 'invite', ...page(() => import('../pages/auth/InvitePage'), 'InvitePage') },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, ...page(() => import('../pages/app/HomePage'), 'HomePage') },
              { path: 'inbox', ...page(() => import('../pages/app/InboxPage'), 'InboxPage') },
            ],
          },
        ],
      },
      ...(import.meta.env.DEV || import.meta.env.MODE === 'e2e'
        ? [
            {
              path: 'dev/design-system',
              ...page(() => import('../design-system/DesignSystemPage'), 'DesignSystemPage'),
            },
          ]
        : []),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
