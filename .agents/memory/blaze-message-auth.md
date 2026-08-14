---
name: Blaze messageAuthData format
description: Correct wire format for EA Blaze RPC message auth — critical for GetMyLeagues and all MCA RPCs
---

## Rule
`messageAuthData` inside `requestInfo` must be a **nested JSON object** `{ authData, authCode, authType }`, NOT a binary blob, NOT three separate fields.

## Algorithm
1. `rand4` = 4 random bytes
2. `hashKey` = MD5(rand4 + staticBytes) where staticBytes = `634203362017bf72f70ba900c0aa4e6b` (hex)
3. `authJson` = JSON.stringify({ staticData: "05e6a7ead5584ab4", requestId, blazeId: Number })
4. `xorBytes` = authJsonBytes XOR hashKey (cyclic 16-byte key)
5. `authDataBytes` = rand4 + xorBytes
6. `authData` = base64(authDataBytes)
7. `authCode` = MD5(staticAuthCode + authDataBytes).toString("base64") where staticAuthCode = `3a53413521464c3b6531326530705b70203a2900` (hex)
8. `authType` = 17039361

## requestInfo structure (pre-stringified JSON string)
```json
{
  "commandName": "...",
  "componentId": 2060,
  "commandId": ...,
  "componentName": "franchisemode",
  "messageAuthData": { "authData": "...", "authCode": "...", "authType": 17039361 },
  "messageExpirationTime": <unix seconds NOW, not +300>,
  "deviceId": "444d362e8e067fe2",
  "ipAddress": "127.0.0.1",
  "requestPayload": "{...}"
}
```

## Outer body
```json
{ "apiVersion": 2, "clientDevice": 3, "requestInfo": "<stringified JSON above>" }
```

## BLAZE_SERVICE_ID uses 4-digit year
`madden-2026-xbsx` (not `madden-26-xbsx`)

**Why:** Verified against Snallabot `src/dashboard/ea_client.ts` + `ea_constants.ts`. Previous attempts with a binary blob or separate messageAuthCode/messageAuthType fields all returned ERR_SYSTEM or MCA_ERR_SERVER_ERROR from Blaze component 2070.

**How to apply:** Any Blaze RPC call via /wal/mca/Process/:sessionKey must use this format.
