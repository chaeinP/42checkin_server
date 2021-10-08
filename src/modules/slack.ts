import env from '@modules/env';
import axios from 'axios';
import {Tracer} from 'tracer';
import ApiError from './api.error';
import logger from '@modules/logger';
import context from 'express-http-context';

const SLACK_API = 'https://hooks.slack.com/services/';

const getLine = (str: string, from: number, to: number) => str.split('\n').slice(from, to).join('\n');

const getErrorFormat = ({ stack, file, line, uid, statusCode, args, message }: IError) => {
	let errorTitle = '';
	if (args[0] instanceof ApiError) {
		errorTitle = args[0].message;
	} else {
		errorTitle = getLine(message, 0, 3);
	}
	const builder = new SlackAttachmentBuilder({});
	builder
		.addField({
			title: 'APP_NAME',
			value: 'checkin'
		})
		.addField({
			title: 'ENV_TYPE',
			value: env.node_env
		})
		.addField({
			title: 'SOURCE',
			value: `${file}:${line}`
		})
		.addField({
			title: 'STATUS_CODE',
			value: statusCode
		});

    let login = context.get('login');
    if (login) {
        builder.addField({
            title: 'LOGIN',
            value: context.get('login')
        })
    }

    builder.addField({
			title: 'UUID',
			value: uid,
			short: false
		})
		.addBlock({
			type: 'header',
			text: {
				type: 'plain_text',
				text: errorTitle,
				emoji: true
			}
		})
		.addBlock({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `\`\`\`${getLine(stack, 0, 10)}\`\`\``
			}
		})
    return builder.toJSON();
};

export const sendErrorMessage = (error: IError) => {
    logger.debug(error);
	const body = getErrorFormat(error);
    axios.post(`${SLACK_API}${env.slack.alarm}`, body).catch(err => logger.error(err));
};


class SlackAttachmentBuilder {
	color: string;
	pretext: string;
	fields: Array<Field>;
	blocks: Array<Block>;

	constructor({color, pretext}: Partial<{color: string, pretext: string}>) {
		this.color = color || '#2eb886';
		this.pretext = pretext || '';
		this.fields = [];
		this.blocks = [];
	}

	addField(field: Field) {
		if (field.short === undefined) {
			field.short = true;
		}
		this.fields.push(field)
		return this;
	}

	addBlock(block: any) {
		this.blocks.push(block)
		return this;
	}

	toJSON() {
		return {
            as_user: false,
            attachments: [
                {
                    color: env.node_env === 'production' ? '#FF0000' : this.color,
                    pretext: this.pretext,
                    fields: this.fields,
                }
            ],
			blocks: this.blocks
		}
	}
}

interface Field {
	title: string;
	value: any;
	short?: boolean;
}
interface Block {
	type: string;
	text: any;
}

type IError = Tracer.LogOutput & { statusCode: number; uid: unknown };