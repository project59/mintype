import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import "../../App.css";
import Page from "../../pages/Page.jsx";
import RootLayout from "../../layouts/root/RootLayout.jsx";
import WorkspaceLayout from "../../layouts/workspaces/WorkspaceLayout.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import WorkspaceHome from "../../pages/WorkspaceHome.jsx";
import Workspace from "../../pages/Workspace.jsx";
import SettingsPanel from "../../layouts/settings/SettingsPanel.jsx";
import SyncSettings from "../../layouts/settings/SyncSettings.jsx";
import SettingsLayout from "../../layouts/settings/SettingsLayout.jsx";
import ExperimentalSettings from "../../layouts/settings/ExperimentalSettings.jsx";
import { Toaster } from 'react-hot-toast';
import PageRedirect from "../../layouts/root/PageRedirect.jsx";
import { useDynamicThemeColor } from "../../utils/useDynamicThemeColor.js"
import ImportPanel from "../../layouts/settings/ImportPanel.jsx";
import ExportPanel from "../../layouts/settings/ExportPanel.jsx";
import QuickSharePage from "../../pages/QuickSharePage.jsx";
import DefaultHome from "../../pages/DefaultHome.jsx";
import SecureSettings from "../../layouts/secure-context/SecureSettings.jsx";
import AnonRootLayout from "../../layouts/root/AnonRootLayout.jsx";
import MyProfile from "../../pages/MyProfile.jsx";
import ResetPage from "../../pages/ResetPage.jsx";
import ErrorPage from "../../pages/ErrorPage.jsx";

const DocsPage = lazy(() => import("../../pages/docs/DocsPage.jsx"));
const docsElement = (
	<Suspense fallback={<div className="min-h-screen bg-white dark:bg-[#10101e]" />}>
		<DocsPage />
	</Suspense>
);

const router = createBrowserRouter([
	{
		path: "/",
		errorElement: <ErrorPage />,
		children: [
			{
				index: true,
				element: <DefaultHome />
			},
			{
				// Outside RootLayout so it opens no databases and works when the app cannot.
				path: "reset",
				element: <ResetPage />
			},
			{
				path: "docs",
				children: [
					{ index: true, element: docsElement },
					{ path: ":slug", element: docsElement },
				]
			},
			{
				// RootLayout wraps everything except DefaultHome
				element: <RootLayout />,
				children: [
					{
						path: "workspace",
						children: [
							{
								index: true,
								element: <WorkspaceHome />
							},
							{
								path: ":workspaceId",
								element: <WorkspaceLayout />,
								children: [
									{
										index: true,
										element: <Workspace />
									},
									{
										path: ":pageId",
										element: <Page />
									}
								]
							}
						]
					},
					{
						path: "page",
						children: [
							{
								index: true,
								element: <Navigate to="/workspace" replace />
							},
							{
								path: ":pageId",
								element: <PageRedirect />
							}
						]
					},
					{
						path: "settings",
						element: <SettingsLayout />,
						children: [
							{
								index: true,
								element: <SettingsPanel />
							},
							{
								path: "security",
								element: <SecureSettings />
							},
							{
								path: "import",
								element: <ImportPanel />
							},
							{
								path: "export",
								element: <ExportPanel />
							},
							{
								path: "account",
								element: <SettingsPanel />
							},
							{
								path: "sync",
								element: <SyncSettings />
							},
							{
								path: "experimental",
								element: <ExperimentalSettings />
							},
							{
								path: "profile",
								element: <MyProfile />
							}
						]
					},
				]
			},
			{
				element: <AnonRootLayout />,
				children: [
					{
						path: "quickshare/:pageId",
						element: <QuickSharePage />
					}
				]
			}
		]
	}
]);

function App() {
	useDynamicThemeColor();

	return (
		<>
			<RouterProvider router={router} />
			<Toaster
				toastOptions={{
					className: '!bg-indigo-500 !text-white !p-1 !px-2 !text-sm',
					style: {
						borderRadius: '50px',
					},
					success: {
						className: '!bg-blue-500 !text-white !p-1 !px-2 !text-sm',
					},
					error: {
						className: '!bg-slate-800 !text-white !p-1 !px-2 !text-sm',
					},
				}}
				containerStyle={{
					top: 60,
					left: 20,
					bottom: 20,
					right: 20,
				}}
			/>
		</>
	)
}

export default App;
