import { requireNativeModule } from 'expo-modules-core';

interface CallRecordingModule {
  startForegroundRecording(): Promise<void>;
  stopForegroundRecording(): Promise<void>;
}

const CallRecording = requireNativeModule<CallRecordingModule>('CallRecording');

export default CallRecording;
