import { Experiment } from './Experiment';

export interface Project {
    name: string;
    experiments: Experiment[];
}