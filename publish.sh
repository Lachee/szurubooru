docker build -t lachee/szurubooru-server:latest ./server && \
  docker push lachee/szurubooru-server:latest

docker build -t lachee/szurubooru-client:latest ./client && \
  docker push lachee/szurubooru-client:latest
