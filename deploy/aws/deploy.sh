#!/bin/bash
set -e

echo "======================================"
echo "  CodeCollab AWS Deployment Script"
echo "======================================"

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME="codecollab-cluster"
DB_NAME="codecollab_db"
REDIS_CLUSTER="codecollab-cache"

echo "Region: $AWS_REGION"
echo "Cluster: $CLUSTER_NAME"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI not found. Please install it first."
    exit 1
fi

# 1. Create ECS Cluster
echo "[1/7] Creating ECS Cluster..."
aws ecs create-cluster \
    --cluster-name $CLUSTER_NAME \
    --region $AWS_REGION \
    || echo "Cluster already exists"

# 2. Create RDS PostgreSQL Instance
echo "[2/7] Creating RDS PostgreSQL database..."
aws rds create-db-instance \
    --db-instance-identifier codecollab-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.3 \
    --master-username codecollab_admin \
    --master-user-password ${DB_PASSWORD:-ChangeThisPassword} \
    --allocated-storage 20 \
    --db-name $DB_NAME \
    --region $AWS_REGION \
    --publicly-accessible \
    --backup-retention-period 7 \
    --multi-az \
    || echo "Database already exists"

# 3. Create ElastiCache Redis
echo "[3/7] Creating ElastiCache Redis cluster..."
aws elasticache create-cache-cluster \
    --cache-cluster-id $REDIS_CLUSTER \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --engine-version 7.0 \
    --num-cache-nodes 1 \
    --region $AWS_REGION \
    || echo "Redis cluster already exists"

# 4. Create S3 Bucket for file storage
echo "[4/7] Creating S3 bucket..."
BUCKET_NAME="codecollab-files-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

echo "S3 Bucket created: $BUCKET_NAME"

# 5. Build and push Docker images to ECR
echo "[5/7] Creating ECR repositories..."
aws ecr create-repository \
    --repository-name codecollab/backend \
    --region $AWS_REGION \
    || echo "Backend repo already exists"

aws ecr create-repository \
    --repository-name codecollab/frontend \
    --region $AWS_REGION \
    || echo "Frontend repo already exists"

# Get ECR login
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin \
    $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
echo "[6/7] Building and pushing backend image..."
docker build -t codecollab/backend:latest ./backend
docker tag codecollab/backend:latest \
    $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/codecollab/backend:latest
docker push \
    $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/codecollab/backend:latest

# Build and push frontend
echo "[7/7] Building and pushing frontend image..."
docker build -t codecollab/frontend:latest ./frontend
docker tag codecollab/frontend:latest \
    $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/codecollab/frontend:latest
docker push \
    $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/codecollab/frontend:latest

echo ""
echo "======================================"
echo "  Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Wait for RDS and Redis to be available (~5-10 minutes)"
echo "2. Create ECS task definitions"
echo "3. Create ECS services"
echo "4. Configure load balancer"
echo ""
echo "S3 Bucket: $BUCKET_NAME"
echo "Database endpoint: (check AWS console)"
echo "Redis endpoint: (check AWS console)"
