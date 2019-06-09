# Plex-Automated-Subtitle-Synchronization

## Overview

### Problem Statement

I have a system where I have many DVDs, both TV shows and movies, that are ripped to a system on my internal network. My family also likes to have the TV run at a low volume and use subtitles to follow the dialog. Also many of the subtitles that exist on OpenSubtitles do not match the audio on the ripped video well.

This system aims to create a mechanism that will scan the existing storage system of video and download the subtitles from OpenSubtitles. The subtitles will then be marked internally as "ready for review." After review a user can mark the subtitle package as a pass or request the system to shift the subtitles for the video for a bit of time specified by the user.

## Running locally (for development or site installs)

In order to run this system for your own collection you will need to first [request a UserAgent](https://trac.opensubtitles.org/projects/opensubtitles/wiki/DevReadFirst) from OpenSubtitles.org. Please read the section titled "How to request a new user agent" for details.

The system is designed to have various components running in docker containers. If you have little or no experience with docker do not fret. In the future as the system is implemented instructions will be available as to how get each component in place.