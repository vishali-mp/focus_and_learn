# Privacy Policy for Focus & Learn Chrome Extension
**Effective Date: May 25, 2026**

This Privacy Policy describes how the "Focus & Learn" Chrome extension ("Extension," "we," "our") handles user information. We are committed to absolute user transparency and data security. 

### 1. Information Handling and Local Storage
The Extension is built strictly on a local-first client architecture. It does NOT track, store, or transmit your personal data, web browsing history, or identities to any external third-party server or to the developer. 

The Extension processes the following data categories entirely locally on your device using Chrome's secure local browser sandbox (`chrome.storage.local`):
* **Authentication Information:** Your personal Gemini API key is stored locally to sign and authorize text-generation requests. It is never exposed or sent anywhere else.
* **User Activity & Statistics:** The extension increments your focus session count and focus duration minutes locally to manage your dashboard statistics.
* **Website Content / Input Topics:** Your chosen learning focus topics are accepted strictly to pass into the prompt payload.

### 2. Third-Party Data Transmission (Google Gemini API)
To fulfill its core single purpose of generating educational micro-lessons during rest breaks, the extension transmits your custom topic keyword directly over a secure HTTPS channel to Google's official Gemini API endpoint (`generativelanguage.googleapis.com`). This transaction is subject to Google's standard developer privacy terms. No personally identifiable information or tracking tokens are appended to these API payloads.

### 3. Remote Code and Security
The Extension complies strictly with Google Chrome Web Store Manifest V3 security requirements. It contains zero remote code execution layers. All components, interface styling, and core tracking engines execute entirely locally using the packaged files on your device.

### 4. Data Retention and Deletion
Because all data is locked to your browser instance, you maintain 100% control over your data. You can delete your historical logs, custom inputs, and saved API keys at any time by clearing the extension data inside your browser settings or by uninstalling the Extension.

### 5. Contact Information
If you have any questions or feedback regarding this client-side privacy policy, please contact the publisher directly through the support tools provided on the Chrome Web Store Listing.