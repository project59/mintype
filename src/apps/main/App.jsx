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
import PublicProfile from "../../pages/PublicProfile.jsx";
import { useDynamicThemeColor } from "../../utils/useDynamicThemeColor.js"
import ImportPanel from "../../layouts/settings/ImportPanel.jsx";
import ProfileLayout from "../../layouts/profile/ProfileLayout.jsx";
import QuickSharePage from "../../pages/QuickSharePage.jsx";
import DefaultHome from "../../pages/DefaultHome.jsx";
import SecureSettings from "../../layouts/secure-context/SecureSettings.jsx";
import StoreHome from "../../pages/StoreHome.jsx";
import StoreItem from "../../pages/StoreItem.jsx";
import GetTokens from "../../pages/GetTokens.jsx";
import AnonRootLayout from "../../layouts/root/AnonRootLayout.jsx";
import MyProfile from "../../pages/MyProfile.jsx";

const router = createBrowserRouter([
	{
		path: "/",
		children: [
			{
				index: true,
				element: <DefaultHome />
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
					{
						path: "user",
						element: <ProfileLayout />,
						children: [
							{
								path: ":userId",
								element: <PublicProfile />
							}
						]
					},
					{
						path: "store",
						children: [
							{
								index: true,
								element: <StoreHome />
							},
							{
								path: ":itemId",
								element: <StoreItem />
							}
						]
					},
					{
						path: "tokens",
						element: <GetTokens />
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
			},
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
