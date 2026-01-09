# Web Browser Specification

## ADDED Requirements

### Requirement: Native Webview Tab
The application MUST render web pages in the Web Browser tab using a Tauri-native webview instead of an iframe.

#### Scenario: Load a website in the tab
**Given** the user enters a URL in the Web Browser tab
**When** they navigate to the URL
**Then** the page should render inside the app tab using a native webview
**And** the tab should indicate loading state while the page is loading

### Requirement: Webview Navigation Controls
The application MUST provide back, forward, refresh, and open-in-external-browser controls for the native webview.

#### Scenario: Navigate back and forward
**Given** the user has visited multiple pages in the Web Browser tab
**When** they press back or forward
**Then** the native webview should navigate to the expected page

#### Scenario: Open in external browser
**Given** a page is loaded in the Web Browser tab
**When** the user clicks the external browser action
**Then** the current URL should open in the system browser
