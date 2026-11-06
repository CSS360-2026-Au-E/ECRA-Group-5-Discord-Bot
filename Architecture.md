Architecture.md file
## Activity Diagrams: Calendar Events (Hakan)

These activity diagrams show the step-by-step flow when a user runs `/event add` and `/event edit`, including each decision the bot makes.

### Activity Diagram 1: `/event add`

```mermaid
flowchart TD
    A([User runs /event add]) --> B[Read title, date, time]
    B --> C{Is the date valid?}
    C -- No --> X1[Reply: not a valid date]
    C -- Yes --> D{Is the time valid?}
    D -- No --> X2[Reply: not a valid time]
    D -- Yes --> E[Load events from events.json]
    E --> F[Give the event the next ID]
    F --> G[Save to events.json]
    G --> H[Reply: Event added!]
    X1 --> Z([End])
    X2 --> Z
    H --> Z
```

### Activity Diagram 2: `/event edit`

```mermaid
flowchart TD
    A([User runs /event edit with an ID]) --> B{Does the event exist?}
    B -- No --> X1[Reply: no event with that ID]
    B -- Yes --> C{Are the new date and time valid?}
    C -- No --> X2[Reply: not a valid date or time]
    C -- Yes --> D{Was anything changed?}
    D -- No --> X3[Reply: nothing to change]
    D -- Yes --> E[Update the event in events.json]
    E --> F[Reply: Event updated!]
    X1 --> Z([End])
    X2 --> Z
    X3 --> Z
    F --> Z
```

### Notes
- Diamonds are yes/no decisions. Every "No" path sends an error that only the user can see.
- Both commands check the input **before** saving, so bad data never gets into `events.json`.
- Known limit: anyone can edit any event right now. A future fix is to only let the creator or a moderator edit it.

### System Context Diagram Description

The System Context Diagram illustrates how the **Calendar & Tasks Discord Bot** interacts with external users, services, and development infrastructure. The bot is represented as a single system within its boundary, focusing on external interactions rather than internal implementation.

At runtime, **Discord serves as the primary communication interface** between server members and the bot. Users submit slash commands through Discord, which forwards interactions to the bot using Gateway events. The bot communicates through Discord's REST API to display calendars, manage events and tasks, send automated reminders, and welcome new members. Welcome messages include an image URL that Discord clients retrieve from an external image host.

The diagram also illustrates the **development and deployment process**, including GitHub Codespaces, GitHub Actions, Docker Hub, and the Docker host. **Solid arrows** represent runtime interactions, while **dotted arrows** represent development, deployment, or indirect interactions.

Local JSON files store application data within the system boundary, so no external database is shown.

## System Context Diagram

```mermaid
flowchart LR
    Members["Server Members"]
    Admins["Server Admins"]
    Devs["Bot Developers"]

    Discord["Discord Platform"]
    ImageHost["External Image Host"]

    Codespaces["GitHub Codespaces"]
    GitHub["GitHub Repository"]
    Actions["GitHub Actions"]
    Hub["Docker Hub"]
    Host["Docker Host"]

    subgraph Boundary["System boundary"]
        Bot["Calendar & Tasks Discord Bot"]
    end

    Members -->|"Slash commands; server joins"| Discord
    Discord -->|"Command replies; welcome messages; reminder DMs"| Members

    Admins -->|"Invite bot; grant permissions"| Discord

    Discord -->|"Gateway WebSocket: ready, interactionCreate, guildMemberAdd"| Bot
    Bot -->|"REST: register slash commands; interaction replies; welcome embeds; fetch users; reminder DMs"| Discord

    Discord -.->|"Clients fetch MEME_URL image"| ImageHost

    Devs -.->|"Write code; configure .env; run npm commands"| Codespaces
    Codespaces -.->|"Develop and push source code"| GitHub
    Codespaces -.->|"Run bot during development"| Bot

    GitHub -.->|"Push to release branch triggers workflow"| Actions
    Actions -.->|"Build node:18 Docker image; publish memebot:latest"| Hub
    Hub -.->|"Docker image pulled by host"| Host
    Host -.->|"Run bot container"| Bot

    classDef system fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef external fill:#f3f4f6,stroke:#6b7280,color:#111827
    class Bot system
    class Members,Admins,Devs,Discord,ImageHost,Codespaces,GitHub,Actions,Hub,Host external
```

**Legend:** Solid arrows represent runtime interactions. Dotted arrows represent build-time, deployment, or indirect interactions. Arrowheads indicate the direction of data or control flow.

### System Context Diagram Description

The System Context Diagram illustrates how the **Calendar & Tasks Discord Bot** interacts with external users, services, and development infrastructure. The bot is represented as a single system within its boundary, focusing on external interactions rather than internal implementation.

At runtime, **Discord serves as the primary communication interface** between server members and the bot. Users submit slash commands through Discord, which forwards interactions to the bot using Gateway events. The bot communicates through Discord's REST API to display calendars, manage events and tasks, send automated reminders, and welcome new members. Welcome messages include an image URL that Discord clients retrieve from an external image host.

The diagram also illustrates the **development and deployment process**, including GitHub Codespaces, GitHub Actions, Docker Hub, and the Docker host. **Solid arrows** represent runtime interactions, while **dotted arrows** represent development, deployment, or indirect interactions.

Local JSON files store application data within the system boundary, so no external database is shown.

