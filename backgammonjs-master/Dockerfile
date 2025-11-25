# Using alpine image, because it is super slim
FROM node:18.13.0-alpine3.16

# Create app directory. This is where source code will be copied to
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Copy source from host to directory in container
COPY . /usr/src/app

# Install application and all its dependencies
RUN npm install

# Expose 8080 port. Client should connect at http://IP_OF_CONTAINER:8080
EXPOSE 8080

# Start application
CMD [ "npm", "start" ]
