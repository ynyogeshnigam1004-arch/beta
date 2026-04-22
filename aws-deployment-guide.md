# AWS Deployment Guide - Voice AI Platform

## Architecture Overview
- **Frontend**: AWS Amplify (React/Vite app)
- **Backend**: AWS Elastic Beanstalk (Node.js)
- **Database**: MongoDB Atlas (recommended) or Amazon DocumentDB
- **File Storage**: Amazon S3
- **CDN**: CloudFront (via Amplify)

## Prerequisites
1. AWS Account
2. AWS CLI installed and configured
3. Node.js 18+ installed locally

## Step 1: Prepare Backend for Deployment

### 1.1 Create Elastic Beanstalk Configuration