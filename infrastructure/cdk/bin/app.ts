#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ChatInterfaceStackMinimal } from '../lib/chatinterface-stack-minimal';
import { CertificateStack } from '../lib/certificate-stack';

const app = new cdk.App();

const config = {
  environment: 'production',
  domainName: 'chatgenie.thought-box.in',
  hostedZoneName: 'thought-box.in',
  instanceType: 't3.micro',
  maxUsers: 100,
};

// ACM Certificate MUST be in us-east-1 for CloudFront
const certStack = new CertificateStack(app, 'CertificateStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  config,
  crossRegionReferences: true,
  description: 'ACM Certificate for ChatGenie CloudFront (us-east-1)',
  tags: {
    Environment: 'production',
    Application: 'ChatGenie',
    ManagedBy: 'CDK',
  },
});

// Main stack in eu-central-1
const mainStack = new ChatInterfaceStackMinimal(app, 'ChatInterfaceStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-central-1',
  },
  config,
  certificate: certStack.certificate,
  crossRegionReferences: true,
  description: 'ChatGenie MVP Production Stack - EU Region (Ultra-Minimal)',
  tags: {
    Environment: 'production',
    Application: 'ChatGenie',
    ManagedBy: 'CDK',
    CostOptimized: 'true',
  },
});

mainStack.addDependency(certStack);

app.synth();
