pipeline {
  agent any
  stages {
    stage('Install') {
      steps {
        sh 'npm i'
      }
    }
    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }
    stage('Test') {
      steps {
        sh 'npm run unit'
      }
    }
  }
}