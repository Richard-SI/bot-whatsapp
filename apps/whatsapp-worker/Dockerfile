FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
ENV PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
EXPOSE 3000
CMD ["npm", "start"]
