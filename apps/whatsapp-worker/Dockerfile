# Usa uma imagem oficial do Node.js leve, mas com suporte a pacotes do Linux
FROM node:18-bullseye-slim

# Instala o Chromium e as dependências do sistema operacional necessárias
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Define a pasta de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o resto do código
COPY . .

# Variáveis de ambiente vitais para o Puppeteer pular o download do Chrome (já instalamos acima)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expõe a porta que o seu Express vai usar
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "src/server.js"]