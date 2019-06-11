# Agent
* scan attached directory in search of files
* required to be a service (cannot use fnProject)

# API



Sep
=============================

# First Run / Subtitle not available for agent
* Agent discovers files and pushes messages to a mds-qs queue
* Agent begins processing queue messages
* Agent computes hash of file
* Agent requests subtitles from API
* API looks up subtitle via hash and detail
    * for movie: [name]-[year]-[hash]
    * for tv show: [name]-S[season-num]-E[episode-num]-[hash]
* If
    * subtitle available: send file to agent
    * subtitle not available:
        * respond 404 to agent
        * locate best match, download, persist file in durable storage
