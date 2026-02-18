#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ChatInterfaceStackMinimal } from '../lib/chatinterface-stack-minimal';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'eu-west-1', // EU Ireland
};

// Stack configuration
const config = {
  environment: 'production',
  domainName: 'chatgenie.thought-box.in',
  hostedZoneName: 'thought-box.in',
  instanceType: 't3.micro', // Free tier eligible (750 hours/month for 12 months)
  maxUsers: 100,
};

new ChatInterfaceStackMinimal(app, 'ChatInterfaceStack', {
  env,
  config,
  description: 'ChatInterface MVP Production Stack - EU Region (Cost Optimized)',
  tags: {
    Environment: 'production',
    Application: 'ChatInterface',
    ManagedBy: 'CDK',
    CostOptimized: 'true',
  },
});

app.synth();
