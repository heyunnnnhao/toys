import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="page">
      <h1>页面不存在</h1>
      <a className="btn" href="#/">
        返回菜单
      </a>
    </div>
  ),
});
