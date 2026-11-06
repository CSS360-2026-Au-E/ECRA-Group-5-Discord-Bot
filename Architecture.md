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