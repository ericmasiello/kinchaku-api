# Build For Docker

```sh
docker compose up -d --build
```

At this point, it'll run locally on port 3000. 

You can attach to the running container by running the following:

```sh
docker exec -it kinchaku-api /bin/sh
```

To exit, run:

```sh
exit
```