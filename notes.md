> Reminder: this is a collection of loose notes from a brain storming session.

## General
* System needs to support multiple users w/ an agent running remotely at each users site

## Components
* Background Job Processor
  * Scan of plex data directory to hydrate store
  * Fetch of Subtitles for each video available on Plex data directory
  * Adjust a subtitle file time-lapse
* System storage
  * Should we have users / settings?

## UI
* Needs to be usable on both a traditional computer as well as a mobile platform
* Area to see "pending review" subtitles
  * Ability to mark "pending review" titles for adjustment or acceptance
* Search TheTvDb for episodes in DVD order with filename output in specified format
* Mechanism to see jobs running in the background along with relevant logs.

## Backend API
* Use GraphQL w/ custom resolvers

## Infrastructure
* Everything should remain platform agnostic. I.e. prefer docker over AWS Lambda or GCP Cloud Functions