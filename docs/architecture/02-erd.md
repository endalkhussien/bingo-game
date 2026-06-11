# 02 — Entity Relationship Diagram

## 1. Full ERD

```mermaid
erDiagram
    users ||--o| agents : "has profile"
    users ||--o{ sessions : "has"
    users ||--o{ audit_logs : "performs"
    users ||--o{ notifications : "receives"

    agents ||--o{ wallet_transactions : "has"
    agents ||--o{ recharge_requests : "submits"
    agents ||--o{ bingo_cards : "owns"
    agents ||--o{ games : "creates"

    recharge_requests }o--|| users : "reviewed by"

    pricing_plans ||--o{ agent_memberships : "subscribes"
    agents ||--o{ agent_memberships : "has"

    games ||--o{ game_cards : "includes"
    bingo_cards ||--o{ game_cards : "assigned to"
    games ||--o{ drawn_numbers : "has"
    games ||--o{ winners : "produces"
    games ||--o| game_revenue : "tracks"

    bingo_cards ||--o{ winners : "wins via"

    users {
        text id PK
        text full_name
        text username UK
        text password_hash
        text role
        text status
        integer created_at
        integer updated_at
    }

    agents {
        text id PK
        text user_id FK_UK
        text phone
        real commission_rate
        real wallet_balance
        text status
        integer created_at
        integer updated_at
    }

    sessions {
        text id PK
        text user_id FK
        text token_hash
        integer expires_at
        integer created_at
    }

    wallet_transactions {
        text id PK
        text agent_id FK
        real amount
        text transaction_type
        text reference_type
        text reference_id
        text description
        real balance_after
        integer created_at
    }

    recharge_requests {
        text id PK
        text agent_id FK
        real amount
        text payment_method
        text reference_number
        text status
        text reviewed_by FK
        text rejection_reason
        integer requested_at
        integer reviewed_at
    }

    pricing_plans {
        text id PK
        text name
        text plan_type
        real price
        integer card_limit
        text duration
        integer duration_days
        boolean is_active
        boolean is_promotional
        integer created_at
        integer updated_at
    }

    agent_memberships {
        text id PK
        text agent_id FK
        text pricing_plan_id FK
        integer starts_at
        integer expires_at
        text status
        integer created_at
    }

    bingo_cards {
        text id PK
        text card_number
        text agent_id FK
        text card_data
        text ball_type
        integer created_at
        integer updated_at
    }

    games {
        text id PK
        text game_code UK
        text agent_id FK
        text game_name
        real bet_amount
        text winning_pattern
        integer draw_speed_ms
        text voice_type
        text language
        text ball_type
        integer number_range_min
        integer number_range_max
        integer max_players
        text status
        integer started_at
        integer completed_at
        integer created_at
        integer updated_at
    }

    game_cards {
        text id PK
        text game_id FK
        text card_id FK
        text player_name
        integer joined_at
    }

    drawn_numbers {
        text id PK
        text game_id FK
        integer number
        integer draw_order
        integer drawn_at
    }

    winners {
        text id PK
        text game_id FK
        text card_id FK
        text game_card_id FK
        text winning_pattern
        real prize_amount
        integer won_at
        boolean is_validated
    }

    game_revenue {
        text id PK
        text game_id FK_UK
        integer total_players
        real total_bets
        real total_payouts
        real platform_revenue
        real agent_revenue
        real commission_revenue
        integer calculated_at
    }

    notifications {
        text id PK
        text user_id FK
        text type
        text title
        text message
        text reference_type
        text reference_id
        boolean is_read
        integer created_at
    }

    audit_logs {
        text id PK
        text user_id FK
        text action
        text entity_type
        text entity_id
        text old_value
        text new_value
        text ip_address
        integer created_at
    }

    system_settings {
        text key PK
        text value
        text value_type
        text category
        text description
        integer updated_at
        text updated_by FK
    }
```

## 2. Entity Descriptions

### 2.1 Core Identity

| Entity | Description | Cardinality Notes |
|--------|-------------|-------------------|
| **users** | Authentication identity for all system users | 1 user may have 0 or 1 agent profile |
| **agents** | Extended profile for AGENT role users | 1:1 with users where role = AGENT |
| **sessions** | Active login sessions for offline auth | Many sessions per user, expired sessions cleaned periodically |

### 2.2 Financial

| Entity | Description | Cardinality Notes |
|--------|-------------|-------------------|
| **wallet_transactions** | Immutable ledger of all wallet movements | Many per agent; append-only |
| **recharge_requests** | Agent-initiated wallet top-up requests | Many per agent; reviewed by admin |
| **game_revenue** | Snapshot of financial outcome per completed game | 1:1 with completed games |

### 2.3 Game Operations

| Entity | Description | Cardinality Notes |
|--------|-------------|-------------------|
| **pricing_plans** | Card packs and membership plans | Admin-managed catalog |
| **agent_memberships** | Active membership subscriptions for agents | Many per agent over time |
| **bingo_cards** | Printable bingo card templates | Many per agent |
| **games** | Bingo game sessions | Many per agent |
| **game_cards** | Junction: cards assigned to a game | Many cards per game |
| **drawn_numbers** | Record of each number drawn in a game | Up to 75 or 80 per game |
| **winners** | Validated winning cards per game | Zero or more per game |

### 2.4 System

| Entity | Description | Cardinality Notes |
|--------|-------------|-------------------|
| **notifications** | In-app notifications for users | Many per user |
| **audit_logs** | Immutable audit trail | Many per user |
| **system_settings** | Key-value configuration store | ~20-30 settings keys |

## 3. Relationship Rules

### 3.1 User ↔ Agent

- A `user` with `role = 'AGENT'` **must** have exactly one `agents` record.
- A `user` with `role = 'SUPER_ADMIN'` **must not** have an `agents` record.
- Deleting/suspending an agent suspends the linked user account.

### 3.2 Agent ↔ Wallet

- `agents.wallet_balance` is a **denormalized cache** of the latest wallet state.
- The authoritative record is the sum of `wallet_transactions`.
- All wallet mutations happen inside SQLite transactions:
  1. Insert `wallet_transaction`
  2. Update `agents.wallet_balance`
  3. Both succeed or both roll back.

### 3.3 Game ↔ Cards ↔ Winners

```
Game created (DRAFT)
  → Cards assigned (game_cards)
  → Game started (RUNNING)
  → Numbers drawn (drawn_numbers)
  → Winner detected → Validated (winners)
  → Game completed (COMPLETED)
  → Revenue calculated (game_revenue)
```

- A card can participate in multiple games (reusable).
- A card can only win once per game per pattern.
- `game_cards` prevents duplicate card assignment within the same game.

### 3.4 Recharge Workflow

```
Agent creates recharge_request (PENDING)
  → Admin reviews
    → APPROVED: wallet_transaction (RECHARGE) + notification
    → REJECTED: notification with reason
```

## 4. Enum Definitions

### users.role
| Value | Description |
|-------|-------------|
| `SUPER_ADMIN` | Platform administrator |
| `AGENT` | Bingo operator/agent |

### users.status / agents.status
| Value | Description |
|-------|-------------|
| `ACTIVE` | Can log in and operate |
| `SUSPENDED` | Login blocked, operations frozen |

### wallet_transactions.transaction_type
| Value | Description |
|-------|-------------|
| `DEPOSIT` | Manual admin deposit |
| `WITHDRAWAL` | Manual admin withdrawal |
| `RECHARGE` | Approved recharge request |
| `GAME_COST` | Cost deducted for creating/running a game |
| `COMMISSION` | Commission credited to agent |
| `BONUS` | Promotional bonus credit |
| `ADJUSTMENT` | Admin balance correction |

### recharge_requests.status
| Value | Description |
|-------|-------------|
| `PENDING` | Awaiting admin review |
| `APPROVED` | Approved and wallet credited |
| `REJECTED` | Rejected by admin |

### pricing_plans.plan_type
| Value | Description |
|-------|-------------|
| `CARD_PACK` | Pay-per-card-bundle (e.g., 10 cards = 40 ETB) |
| `MEMBERSHIP` | Time-based access (Daily/Weekly/Monthly) |

### games.status
| Value | Description |
|-------|-------------|
| `DRAFT` | Created but not started |
| `SCHEDULED` | Scheduled for future start |
| `RUNNING` | Active, numbers being drawn |
| `PAUSED` | Temporarily paused |
| `COMPLETED` | Finished normally |
| `CANCELLED` | Cancelled before completion |

### games.winning_pattern
| Value | Description |
|-------|-------------|
| `SINGLE_LINE` | Any single row, column, or diagonal |
| `DOUBLE_LINE` | Any two lines |
| `FOUR_CORNERS` | Four corner cells |
| `X_PATTERN` | Both diagonals |
| `FULL_HOUSE` | All cells marked |

### games.ball_type
| Value | Description |
|-------|-------------|
| `BALL_75` | American 75-ball (B:1-15, I:16-30, N:31-45, G:46-60, O:61-75) |
| `BALL_80` | 80-ball (1-80) |

### games.voice_type
| Value | Description |
|-------|-------------|
| `AMHARIC_MALE` | Amharic male TTS voice |
| `AMHARIC_FEMALE` | Amharic female TTS voice |
| `ENGLISH` | English TTS voice |

### notifications.type
| Value | Description |
|-------|-------------|
| `RECHARGE_APPROVED` | Recharge request approved |
| `RECHARGE_REJECTED` | Recharge request rejected |
| `GAME_STARTED` | Game has started |
| `GAME_COMPLETED` | Game has completed |
| `WINNER_DECLARED` | Winner declared in a game |
| `ACCOUNT_SUSPENDED` | Account suspended by admin |
| `LOW_BALANCE` | Wallet balance below threshold |
| `SYSTEM` | General system notification |

## 5. Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| users | `username` (UNIQUE) | Login lookup |
| agents | `user_id` (UNIQUE) | Profile lookup by user |
| sessions | `token_hash` | Session validation |
| sessions | `user_id, expires_at` | Session cleanup |
| wallet_transactions | `agent_id, created_at` | Wallet history queries |
| recharge_requests | `status, requested_at` | Admin pending queue |
| games | `agent_id, status` | Agent game list |
| games | `game_code` (UNIQUE) | Game lookup |
| drawn_numbers | `game_id, number` (UNIQUE) | Duplicate prevention |
| winners | `game_id, card_id` (UNIQUE) | Duplicate winner prevention |
| audit_logs | `user_id, created_at` | Audit queries |
| audit_logs | `entity_type, entity_id` | Entity history |
| notifications | `user_id, is_read` | Unread count |
