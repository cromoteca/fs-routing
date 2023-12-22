import MainLayout from 'Frontend/MainLayout.js';
import { createElement, lazy } from 'react';
import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { getFsViews } from './util/routing';
import viewComponents from 'Frontend/generated/views.js';
import {serverSideRoutes} from 'Frontend/generated/flow/Flow';

const fsRoutes = getFsViews().filter(view => view.clientSide).map(view => {
    return {path: view.route, element: createElement((viewComponents as any)[view.id]), handle: {title: view.title}};
  }
);

export const routes = [
  {
    element: <MainLayout />,
    handle: { title: 'Main' },
    children: [
      ...fsRoutes,
      ...serverSideRoutes
    ],
  },
] as RouteObject[];

export default createBrowserRouter(routes);
