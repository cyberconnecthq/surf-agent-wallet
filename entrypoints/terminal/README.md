<!-- @format -->

# Terminal Debug Panel - Modular Structure

This directory contains the modularized components and utilities for the Wallet Debug Panel.

## Directory Structure

```
terminal/
├── components/           # React UI components
│   ├── WalletDebugPanel.tsx    # Main panel component
│   ├── StatusTag.tsx           # Status indicator component
│   ├── DebugCallItem.tsx      # Debug call display component
│   └── TokenBalanceItem.tsx    # Token balance display component
├── hooks/               # Custom React hooks
│   ├── useWalletData.ts       # Wallet state management
│   ├── useDebugCalls.ts       # Debug calls tracking
│   └── useMessageListener.ts   # Message event handling
├── constants.ts         # App constants and configurations
├── types.ts            # TypeScript type definitions
├── utils.ts            # Utility functions
├── index.ts            # Module exports
└── README.md           # This file
```

## Key Features

### Types (`types.ts`)

- `DebugCall`: Function call tracking interface
- `NetworkInfo`: Network information structure
- `TokenBalance`: Token balance data structure
- `WalletState`: Complete wallet state interface
- `MessageData`: Message handling interface

### Constants (`constants.ts`)

- Token contract addresses
- Token icons mapping
- Network names mapping
- Default configurations

### Utils (`utils.ts`)

- Hex to ETH/Token conversion functions
- Network name resolution
- Address formatting
- Message ID generation utilities
- ERC-20 call data creation

### Hooks

- **`useWalletData`**: Manages wallet connection, address, network info, and token balances
- **`useDebugCalls`**: Tracks and manages function call debugging
- **`useMessageListener`**: Handles all window message events and wallet interactions

### Components

- **`WalletDebugPanel`**: Main container component
- **`StatusTag`**: Reusable status indicator for calls
- **`DebugCallItem`**: Individual debug call display
- **`TokenBalanceItem`**: Individual token balance display

## Benefits of Modularization

1. **Maintainability**: Easier to find and modify specific functionality
2. **Reusability**: Components and hooks can be reused elsewhere
3. **Testability**: Individual modules can be tested in isolation
4. **Readability**: Cleaner, more focused code files
5. **Separation of Concerns**: Each module has a single responsibility
6. **Type Safety**: Better TypeScript support with dedicated type definitions

## Usage

Import what you need from the main module:

```typescript
import { WalletDebugPanel, useWalletData, TokenBalance } from "./terminal";
```

Or import from specific modules:

```typescript
import { useWalletData } from "./terminal/hooks/useWalletData";
import { StatusTag } from "./terminal/components/StatusTag";
```
