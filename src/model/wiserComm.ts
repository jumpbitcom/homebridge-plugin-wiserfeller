// Purpose: Interfaces for Wiser communication

export interface IerrorResponse {
    status : 'success' | 'fail' | 'error';
    message: string;
}

export interface IloadsResponse {
    status : 'success' | 'fail' | 'error';
    data: [ Iload ];
}

export interface IloadStateResponse {
    status : 'success' | 'fail' | 'error';
    data: {
        id: number;
        state: IloadState;
    }
}

export interface IsetLoadStateResponse {
    status : 'success' | 'fail' | 'error';
    data: {
        id: number;
        target_state: IloadState;
    }
}

export interface IsetLoadCtrlResponse {
    status : 'success' | 'fail' | 'error';
    data: {
        id: number;
        ctrl: IloadCtrl;
    }
}



export interface Iload {
    id : number;
    name: string;
    room : number;
    type: string;
    sub_type: string;
    device: string;
    channel: number;
    unused: boolean;
    kind: number;
}

export interface IloadState{
    bri?: number;
    level?: number;
    tilt?: number;
    moving?: 'down' | 'up' | 'stop';
    flags?: string;
}

export interface IloadCtrl {
    button: 'on' | 'off'| 'up' | 'down' | 'toggle' | 'stop';
    event: 'click' | 'press' | 'release';
}