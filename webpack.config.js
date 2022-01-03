const path = require('path');
const webpack = require('webpack');

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const dotenv = require('dotenv');
const { NODE_ENV } = process.env;

console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

dotenv.config({
    path: `.env.${process.env.NODE_ENV}`
});
const output_path = `dist.${process.env.NODE_ENV}`;

module.exports = {
	entry: './src/app.ts',
	target: 'node',
	externals: [nodeExternals()],
	optimization: {
		minimize: false,
	},
	output: {
		filename: 'app.js',
		path: path.resolve(__dirname, output_path)
	},
	devtool: 'cheap-module-eval-source-map',
	resolve: {
		// Add `.ts` and `.tsx` as a resolvable extension.
		extensions: ['.ts', '.tsx', '.js'],
		alias: {
			"@services": path.resolve(__dirname, "./src/services/"),
			"@controllers": path.resolve(__dirname, "./src/controllers/"),
			"@routes": path.resolve(__dirname, "./src/routes/"),
			"@modules": path.resolve(__dirname, "./src/modules/"),
            "@models": path.resolve(__dirname, "./src/models/"),
		},
		plugins: [
			new TsconfigPathsPlugin(),
		]
	},
	module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            {
                test: /\.tsx?$/, loader: 'ts-loader'
            },
            {
                test: /\.jsx?$/,
                loaders: ['babel?retainLines=true'],
                include: path.join(__dirname, 'src')
            }
        ]
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.PORT': JSON.stringify(process.env.PORT),
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
			'process.env.DATABASE_HOST': JSON.stringify(process.env.DATABASE_HOST),
			'process.env.DATABASE_PORT': JSON.stringify(process.env.DATABASE_PORT),
			'process.env.DATABASE_USERNAME': JSON.stringify(process.env.DATABASE_USERNAME),
			'process.env.DATABASE_PASSWORD': JSON.stringify(process.env.DATABASE_PASSWORD),
			'process.env.DATABASE_NAME': JSON.stringify(process.env.DATABASE_NAME),
			'process.env.CLIENT_ID': JSON.stringify(process.env.CLIENT_ID),
			'process.env.CLIENT_SECRET': JSON.stringify(process.env.CLIENT_SECRET),
			'process.env.CLIENT_CALLBACK': JSON.stringify(process.env.CLIENT_CALLBACK),
            'process.env.SLACK_OAUTH_CLIENT_ID': JSON.stringify(process.env.SLACK_OAUTH_CLIENT_ID),
            'process.env.SLACK_OAUTH_CLIENT_SECRET': JSON.stringify(process.env.SLACK_OAUTH_CLIENT_SECRET),
			'process.env.JWT_SECRET': JSON.stringify(process.env.JWT_SECRET),
			'process.env.LOG_DEBUG': JSON.stringify(process.env.LOG_DEBUG),
			'process.env.DISCORD_GAEPO_ID': JSON.stringify(process.env.DISCORD_GAEPO_ID),
			'process.env.DISCORD_GAEPO_PW': JSON.stringify(process.env.DISCORD_GAEPO_PW),
			'process.env.DISCORD_SEOCHO_ID': JSON.stringify(process.env.DISCORD_SEOCHO_ID),
			'process.env.DISCORD_SEOCHO_PW': JSON.stringify(process.env.DISCORD_SEOCHO_PW),
			'process.env.MAIL': JSON.stringify(process.env.MAIL),
			'process.env.URL_CLIENT': JSON.stringify(process.env.URL_CLIENT),
			'process.env.URL_CLIENT_OLD': JSON.stringify(process.env.URL_CLIENT_OLD),
			'process.env.URL_ROOTHOST': JSON.stringify(process.env.URL_ROOTHOST),
			'process.env.URL_ADMIN': JSON.stringify(process.env.URL_ADMIN),
			'process.env.COOKIE_AUTH': JSON.stringify(process.env.COOKIE_AUTH),
			'process.env.SLACK_ALARM': JSON.stringify(process.env.SLACK_ALARM),
            'process.env.SLACK_TEST': JSON.stringify(process.env.SLACK_TEST),
            'process.env.SLACK_CS': JSON.stringify(process.env.SLACK_CS),
            'process.env.PASSPORT_STRATEGY': JSON.stringify(process.env.PASSPORT_STRATEGY),
            'process.env.IP_FILTER': JSON.stringify(process.env.IP_FILTER),
			'process.env.FT_GUEST_IP': JSON.stringify(process.env.FT_GUEST_IP),
			'process.env.DEVELOPER01_IP': JSON.stringify(process.env.DEVELOPER01_IP),
			'process.env.DEVELOPER02_IP': JSON.stringify(process.env.DEVELOPER02_IP),
            APP_NAME: JSON.stringify("42Checkin"),
		}),
        // https://www.daleseo.com/webpack-plugins-define-environment/
        new webpack.EnvironmentPlugin([
            // CORE
            'PORT',
            'NODE_ENV',
            'DATABASE_HOST',
            'DATABASE_PORT',
            'DATABASE_USERNAME',
            'DATABASE_PASSWORD',
            'DATABASE_NAME',
            'JWT_SECRET',
            'PASSPORT_STRATEGY',
            // SLACK
            'CLIENT_ID',
            'CLIENT_SECRET',
            'CLIENT_CALLBACK',
            // CORS
            'URL_CLIENT',
            'URL_CLIENT_OLD',
            'URL_ADMIN',
            'COOKIE_AUTH',
            'COOKIE_DOMAIN',
            // SLACK
            'SLACK_ALARM',
            'SLACK_TEST',
            'SLACK_CS',
            // MISC
            'IP_FILTER',
            'FT_GUEST_IP',
            'DEVELOPER01_IP',
            'DEVELOPER02_IP',
            'DISCORD_GAEPO_ID',
            'DISCORD_GAEPO_PW',
            'DISCORD_SEOCHO_ID',
            'DISCORD_SEOCHO_PW',
            'MAIL'
        ])
	]
};
