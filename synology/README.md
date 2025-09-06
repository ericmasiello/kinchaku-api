# Deploying to Synology

The docker-compose.yml file is all that's necessary to run the app on Synology.

The app is designed to run on port 3000. The reverse proxy configured on
synology expects this port which it maps to https://kinchaku.synology.me.

## Deploying Changes.

When the app merges to `main`, the github action will run, publishing a new Docker Container to GHCR.

Inside the job, it will tell you version information (see https://github.com/ericmasiello/kinchaku-api/actions/runs/17507414492/job/49733473185).

```
...
#18 DONE 6.4s

#19 pushing ghcr.io/ericmasiello/kinchaku-api/kinchaku-api:a9d593c with docker
...
```

Copy that git sha (`a9d593c`). Then navigate to Synology.

1. https://quickconnect.to/
2. Login
3. Open Package Center
4. Open Container Manager
5. Click Project
6. Double Click the Kinchku project
7. Stop the service (this will take it down)
8. Once it's down, update the `image` to include the new git sha
9. Click Action -> Restart

At this point, the app should be up and running with the latest version.
