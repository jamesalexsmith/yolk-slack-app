# TODO:

## Features:
    Send us an email when a person types operator
    Send thanks message when accepting answer
    Refactor answer_callback to not use a route
    Create a dispatch service for listening to all messages:
        - If occurred in yolk ask thread
        - If a question initiate sniffing procedure

    Sniffing:
        - Message asker saying we noticed you asked a question
            - Show them top 3 results from yolk
            - If there
                - Create a yolk emoji and checkmark on the question
            - If not
                - Ask them to post the question through yolk
                - Preinitiate the ask flow
            - Dismiss
                - Buttons: Unimportant, Cancel, Dismiss

    Notification on activity:
        - Just post the answer in the DM in a THREAD

    Search:
        - @mention or direct message normal text

    Drive Integration:
        - Message all users a link to authenticate
        - add where is ask command that also leverages google/confluence

    Seeding Knowledge Base:
        - Import export CSV Q/A pairs

    Stats:
        - weekly, last month, since launch, before launch