FROM ubuntu:22.04

LABEL maintainer="Hellar Developers <dev@hellar.io>"
LABEL description="Hellar Network Deployment Tool"

# Install build utils and Firefox deps

RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    bzip2 \
    ca-certificates \
    curl \
    git \
    gnupg \
    openvpn \
    python3-pip \
    python3-setuptools \
    software-properties-common \
    ssh \
    unzip

# Install Node.JS

ENV NODE_MAJOR=20
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    nodejs

# Install terraform

ARG TERRAFORM_VERSION=1.5.7
RUN curl -fsSLO https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip -d /usr/bin && \
    rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Install Docker client

ENV DOCKERVERSION=24.0.6
RUN curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKERVERSION}.tgz \
    && tar xzvf docker-${DOCKERVERSION}.tgz --strip 1 -C /usr/local/bin docker/docker \
    && rm docker-${DOCKERVERSION}.tgz

# Install Chrome

# Check available versions here: https://www.ubuntuupdates.org/package/google_chrome/stable/main/base/google-chrome-stable
ENV CHROMEVERSION=117.0.5938.88-1
ENV CHROME_BIN="/usr/bin/google-chrome"
RUN curl -fsSL https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROMEVERSION}_amd64.deb -o /tmp/chrome.deb \
    && apt install -y --no-install-recommends /tmp/chrome.deb \
    && rm /tmp/chrome.deb

# Copy hellar-cli form hellard image

COPY --from=hellarcore/hellard:latest /usr/local/bin/hellar-cli /usr/local/bin

# Copy sources

WORKDIR /usr/src/app

# Install ansible playbook and Node.JS dependencies

COPY ansible/requirements.yml /ansible-requirements.yml

COPY package*.json ./

RUN python3 -m pip install -U pip && \
    python3 -m pip install --upgrade netaddr awscli jmespath ansible ansible-lint boto3 botocore && \
    ansible-galaxy install -r /ansible-requirements.yml && \
    npm install

# Remove build utils
RUN apt-get remove --purge -y \
    python3-pip \
    python3-setuptools \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Create networks shortcut

RUN ln -s /usr/src/app/networks /networks

VOLUME ["/networks"]
VOLUME ["/usr/src/app/terraform/aws/.terraform"]

ENTRYPOINT ["/usr/src/app/docker/entrypoint.sh"]

CMD ["deploy", "--help"]
