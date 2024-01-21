resource "aws_security_group" "default" {
  name        = "${terraform.workspace}-ssh"
  description = "ssh access"
  vpc_id      = aws_vpc.default.id

  # SSH access from anywhere
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    description = "SSH"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # ET SSH access from anywhere
  ingress {
    from_port   = 2022
    to_port     = 2022
    protocol    = "tcp"
    description = "ET SSH"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # Docker API
  ingress {
    from_port   = var.docker_port
    to_port     = var.docker_port
    protocol    = "tcp"
    description = "Docker API"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  # outbound internet access
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"

    cidr_blocks = flatten([
      "0.0.0.0/0",
      aws_subnet.public.*.cidr_block,
    ])
  }

  tags = {
    Name        = "dn-${terraform.workspace}-default"
    HellarNetwork = terraform.workspace
  }
}

# hellard nodes not accessible from the public internet
resource "aws_security_group" "hellard_private" {
  name        = "${terraform.workspace}-hellard-private"
  description = "hellard private node"
  vpc_id      = aws_vpc.default.id

  # Hellar Core access
  ingress {
    from_port   = var.hellard_port
    to_port     = var.hellard_port
    protocol    = "tcp"
    description = "hellarcore P2P"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
    ])
  }

  # hellarcore RPC access
  ingress {
    from_port   = var.hellard_rpc_port
    to_port     = var.hellard_rpc_port
    protocol    = "tcp"
    description = "hellarcore RPC"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  # hellarcore ZMQ acess
  ingress {
    from_port   = var.hellard_zmq_port
    to_port     = var.hellard_zmq_port
    protocol    = "tcp"
    description = "hellarcore ZMQ"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  tags = {
    Name        = "dn-${terraform.workspace}-hellard-private"
    HellarNetwork = terraform.workspace
  }
}

# hellard node accessible from the public internet
resource "aws_security_group" "hellard_public" {
  name        = "${terraform.workspace}-hellard-public"
  description = "hellard public network"
  vpc_id      = aws_vpc.default.id

  # Hellar Core access
  ingress {
    from_port   = var.hellard_port
    to_port     = var.hellard_port
    protocol    = "tcp"
    description = "hellarcore P2P"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # hellarcore RPC access
  ingress {
    from_port   = var.hellard_rpc_port
    to_port     = var.hellard_rpc_port
    protocol    = "tcp"
    description = "hellarcore RPC"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  # hellarcore ZMQ acess
  ingress {
    from_port   = var.hellard_zmq_port
    to_port     = var.hellard_zmq_port
    protocol    = "tcp"
    description = "hellarcore ZMQ"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  tags = {
    Name        = "dn-${terraform.workspace}-hellard-public"
    HellarNetwork = terraform.workspace
  }
}

resource "aws_security_group" "http" {
  name        = "${terraform.workspace}-http"
  description = "web node"
  vpc_id      = aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    description = "Faucet"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  ingress {
    from_port   = var.insight_port
    to_port     = var.insight_port
    protocol    = "tcp"
    description = "Insight Explorer"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  tags = {
    Name        = "dn-${terraform.workspace}-http"
    HellarNetwork = terraform.workspace
  }
}

resource "aws_security_group" "logs" {
  name        = "${terraform.workspace}-logs"
  description = "logs node"
  vpc_id      = aws_vpc.default.id

  ingress {
    from_port   = var.kibana_port
    to_port     = var.kibana_port
    protocol    = "tcp"
    description = "Kibana"

    cidr_blocks = flatten([
      "0.0.0.0/0",
    ])
  }

  ingress {
    from_port   = 9200
    to_port     = 9200
    protocol    = "tcp"
    description = "Elasticsearch HTTP"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  ingress {
    from_port   = 9300
    to_port     = 9300
    protocol    = "tcp"
    description = "Elasticsearch TCP transport"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  tags = {
    Name        = "dn-${terraform.workspace}-logs"
    HellarNetwork = terraform.workspace
  }
}

# hellard node accessible from the public internet
resource "aws_security_group" "hp_masternode" {
  name        = "${terraform.workspace}-hp-masternode"
  description = "hp masternode"
  vpc_id      = aws_vpc.default.id

  # Insight API access
  ingress {
    from_port   = var.insight_port
    to_port     = var.insight_port
    protocol    = "tcp"
    description = "Insight API"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  # Drive
  ingress {
    from_port   = var.drive_port
    to_port     = var.drive_port
    protocol    = "tcp"
    description = "Drive"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  # hapi
  ingress {
    from_port   = var.hapi_port
    to_port     = var.hapi_port
    protocol    = "tcp"
    description = "hapi"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # Tendermint P2P
  ingress {
    from_port   = var.tendermint_p2p_port
    to_port     = var.tendermint_p2p_port
    protocol    = "tcp"
    description = "Tendermint P2P"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # Tenderhellar prometheus
  ingress {
    from_port   = 36660
    to_port     = 36660
    protocol    = "tcp"
    description = "Tenderhellar prometheus"

    cidr_blocks = [
      "10.0.0.0/8",
    ]
  }

  # Tendermint ABCI
  ingress {
    from_port   = var.tendermint_abci_port
    to_port     = var.tendermint_abci_port
    protocol    = "tcp"
    description = "Tendermint ABCI"

    cidr_blocks = flatten([
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  # Tendermint RPC
  ingress {
    from_port   = var.tendermint_rpc_port
    to_port     = var.tendermint_rpc_port
    protocol    = "tcp"
    description = "Tendermint RPC"

    cidr_blocks = flatten([
      aws_subnet.public.*.cidr_block,
      "${aws_eip.vpn[0].public_ip}/32",
    ])
  }

  # ZeroSSL IP verification
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    description = "ZeroSSL IP verification"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  tags = {
    Name        = "dn-${terraform.workspace}-hp-masternode"
    HellarNetwork = terraform.workspace
  }
}

# A security group for the ELB so it is accessible via the web
resource "aws_security_group" "elb" {
  name   = "${terraform.workspace}-elb"
  vpc_id = aws_vpc.default.id

  # Faucet
  ingress {
    from_port   = var.faucet_port
    to_port     = var.faucet_port
    protocol    = "tcp"
    description = "Faucet"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # Faucet HTTPS
  ingress {
    from_port   = var.faucet_https_port
    to_port     = var.faucet_https_port
    protocol    = "tcp"
    description = "Faucet HTTPS"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # Insight Explorer
  ingress {
    from_port   = var.insight_port
    to_port     = var.insight_port
    protocol    = "tcp"
    description = "Insight Explorer"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # Insight Explorer HTTPS
  ingress {
    from_port   = var.insight_https_port
    to_port     = var.insight_https_port
    protocol    = "tcp"
    description = "Insight Explorer HTTPS"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # outbound internet access
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  tags = {
    Name        = "dn-${terraform.workspace}-elb"
    HellarNetwork = terraform.workspace
  }
}

resource "aws_security_group" "vpn" {
  count = var.vpn_enabled ? 1 : 0

  name        = "${terraform.workspace}-vpn"
  description = "vpn client access"
  vpc_id      = aws_vpc.default.id

  # SSH access from anywhere
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    description = "SSH"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # VPN Client
  ingress {
    from_port   = var.vpn_port
    to_port     = var.vpn_port
    protocol    = "udp"
    description = "VPN client"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  # outbound internet access
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"

    cidr_blocks = flatten([
      "0.0.0.0/0",
      aws_subnet.public.*.cidr_block,
    ])
  }

  tags = {
    Name        = "dn-${terraform.workspace}-vpn"
    HellarNetwork = terraform.workspace
  }
}

resource "aws_security_group" "seed" {
  name        = "${terraform.workspace}-seed"
  description = "seed node"
  vpc_id      = aws_vpc.default.id

  # Tendermint P2P
  ingress {
    from_port   = var.tendermint_p2p_port
    to_port     = var.tendermint_p2p_port
    protocol    = "tcp"
    description = "Tendermint P2P"

    cidr_blocks = [
      "0.0.0.0/0",
    ]
  }

  tags = {
    Name        = "dn-${terraform.workspace}-seed"
    HellarNetwork = terraform.workspace
  }
}
