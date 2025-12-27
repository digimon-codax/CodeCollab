#!/bin/bash
set -e

echo "======================================"
echo "  CodeCollab GCP Deployment Script"
echo "======================================"

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-codecollab}
REGION=${GCP_REGION:-us-central1}
SERVICE_NAME="codecollab"

echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Check gcloud
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI not found. Please install it first."
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# 1. Enable required APIs
echo "[1/7] Enabling required GCP APIs..."
gcloud services enable \
    run.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    storage-api.googleapis.com \
    containerregistry.googleapis.com

# 2. Create Cloud SQL PostgreSQL instance
echo "[2/7] Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create codecollab-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password=${DB_PASSWORD:-ChangeThisPassword} \
    --backup \
    --backup-start-time=03:00 \
    || echo "Database instance already exists"

# Create database
gcloud sql databases create collab_db \
    --instance=codecollab-db \
    || echo "Database already exists"

# 3. Create Cloud Memorystore Redis instance
echo "[3/7] Creating Cloud Memorystore Redis..."
gcloud redis instances create codecollab-cache \
    --size=1 \
    --region=$REGION \
    --redis-version=redis_7_0 \
    || echo "Redis instance already exists"

# 4. Create Cloud Storage bucket
echo "[4/7] Creating Cloud Storage bucket..."
BUCKET_NAME="${PROJECT_ID}-files"
gsutil mb -l $REGION gs://$BUCKET_NAME/ || echo "Bucket already exists"
gsutil versioning set on gs://$BUCKET_NAME/

echo "Storage bucket: $BUCKET_NAME"

# 5. Build and push Docker images to Container Registry
echo "[5/7] Building Docker images..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/codecollab-backend:latest ./backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/codecollab-frontend:latest ./frontend

# 6. Get database connection string
echo "[6/7] Getting connection details..."
DB_CONNECTION=$(gcloud sql instances describe codecollab-db \
    --format='value(connectionName)')

REDIS_HOST=$(gcloud redis instances describe codecollab-cache \
    --region=$REGION \
    --format='value(host)')

REDIS_PORT=$(gcloud redis instances describe codecollab-cache \
    --region=$REGION \
    --format='value(port)')

# 7. Deploy to Cloud Run
echo "[7/7] Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/codecollab-backend:latest \
    --region=$REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="DATABASE_URL=postgresql://codecollab_admin:${DB_PASSWORD}@/$DB_CONNECTION/collab_db" \
    --set-env-vars="REDIS_URL=redis://$REDIS_HOST:$REDIS_PORT" \
    --set-cloudsql-instances=$DB_CONNECTION \
    --memory=512Mi \
    --cpu=1 \
    --max-instances=10

echo ""
echo "======================================"
echo "  Deployment Complete!"
echo "======================================"
echo ""
echo "Service URL:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
echo ""
echo "Database connection: $DB_CONNECTION"
echo "Redis host: $REDIS_HOST:$REDIS_PORT"
echo "Storage bucket: gs://$BUCKET_NAME"
