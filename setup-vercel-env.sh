#!/bin/bash

# Setup Vercel Environment Variables
# This script adds all required environment variables to Vercel production

TOKEN="gW3aBTNMpS9GB2n8cOe3CvvD"

echo "🔧 Setting up Vercel environment variables..."
echo ""

# Read from .env.local file
source .env.local

# Function to add environment variable
add_env() {
    local name=$1
    local value=$2
    echo "Adding $name..."
    echo "$value" | vercel env add "$name" production --token="$TOKEN" --yes 2>&1 | grep -v "Vercel CLI"
}

# Add all environment variables
add_env "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"
add_env "PERPLEXITY_API_KEY" "$PERPLEXITY_API_KEY"
add_env "SENDGRID_API_KEY" "$SENDGRID_API_KEY"
add_env "SENDGRID_FROM_EMAIL" "$SENDGRID_FROM_EMAIL"
add_env "SENDGRID_REPLY_TO_EMAIL" "$SENDGRID_REPLY_TO_EMAIL"
add_env "API2PDF_API_KEY" "$API2PDF_API_KEY"
add_env "LLAMA_CLOUD_API_KEY" "$LLAMA_CLOUD_API_KEY"

echo ""
echo "✅ Environment variables added!"
echo ""
echo "📋 Verifying environment variables..."
vercel env ls --token="$TOKEN"
echo ""
echo "🚀 Ready to redeploy with: vercel --prod --yes --token=$TOKEN"
