const path = require("path");
const HappyPack = require("happypack");
const os = require("os");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HappyThreadPool = HappyPack.ThreadPool({ size: os.cpus().length });
const _ = require("lodash");

const userpath = path.resolve( "../../" );

var directConfig;
try {
  directConfig = require( path.resolve( userpath, "./direct.config.js") );
} catch( $ ) {
  directConfig = {
    frontendCore: path.resolve( userpath, "./src/Frontend/" ),
    serverConfig: path.resolve( userpath, "./src/Server/Config/" )
  }
}

const serverConfig = require(
  path.resolve( directConfig.serverConfig, "./server" )
);

var protocol = serverConfig.https ? "https" : "http";
var port = serverConfig.port;

var compilerConfig = {
  mainApiHost: "127.0.0.1",
  resolve: {
    alias: {},
    modules: [],
    extensions: []
  },
  module: {
    rules: []
  },
  devServerProxy: {},
  devtool: "source-map",
  plugins: [],
  devOnlyPlugins: [],
  HtmlWebpackPluginConfig: {},
  cssLoaderOptions: {},
  lessLoaderOptions: {},
  fileLoaderOptions: {},
  cacheGroups: {}
};

try {
  _.merge(
    compilerConfig,
    require( path.resolve( userpath, "./webpack.config.js" ) )
  );
} catch( e ){
  console.log("An error happened when loading webpack config:", e.message );
}

module.exports = {
  entry: {
    index: path.resolve("./App")
  },
  output: {
    path: path.resolve( userpath, "./public" ),
    filename: "[name]-[hash].js",
    chunkFilename: "./static/js/[name]-[chunkhash].js",
    publicPath: "/"
  },
  watch: true,
  watchOptions: {
    ignored: path.resolve( userpath, "./node_modules" ),
    aggregateTimeout: 1200
  },
  resolve: {
    alias: {
      socket$: path.resolve( __dirname, "./App/socket.js" ),
      Core: directConfig.frontendCore,
      ...compilerConfig.resolve.alias
    },
    modules: [
      ...compilerConfig.resolve.modules,
      "./node_modules",
      path.resolve( userpath, "./src/" )
    ],
    extensions: [
      ...compilerConfig.resolve.extensions,
      ".jsx",
      ".js",
      ".css",
      ".less"
    ]
  },
  devtool: compilerConfig.devtool,
  devServer: {
    contentBase: path.join( userpath, "/public" ),
    proxy: {
      "/api": {
        target: `${protocol}://${compilerConfig.mainApiHost}:${port}`,
        secure: false
      },
      "/socket.io": {
        target: `${protocol}://${compilerConfig.mainApiHost}:${port}`,
        secure: false
      },
      ...compilerConfig.devServerProxy
    },
    historyApiFallback: {
      index: "/index.html"
    },
    inline: true
  },
  module: {
    rules: [
      ...compilerConfig.module.rules,
      {
        test: /.*node_modules.*direct.*\.jsx?$/,
        use: "happypack/loader?id=babel"
      },
      {
        test: /\.jsx?$/,
        use: "happypack/loader?id=babel",
        exclude: [
          /node_modules/
        ]
      },
      {
        test: /\.less$/,
        use: "happypack/loader?id=styles"
      },
      {
        test: /\.(jpe?g|png|gig|webp)$/,
        loaders: [
          {
            loader: "file-loader",
            options: compilerConfig.fileLoaderOptions
          }
        ]
      }
    ]
  },
  plugins: [
    ...compilerConfig.plugins,
    ...compilerConfig.devOnlyPlugins,
    new HtmlWebpackPlugin({
      template: path.resolve( userpath, "./src/Frontend/Core/index.html" ),
      ...compilerConfig.HtmlWebpackPluginConfig
    }),
    new HappyPack({
      id: "babel",
      loaders: ["babel-loader?cacheDirectory"],
      threadPool: HappyThreadPool
    }),
    new HappyPack({
      id: "styles",
      loaders: [
        "style-loader",
        {
          loader: "css-loader",
          options: {
            modules: true,
            minimize: true,
            ...compilerConfig.cssLoaderOptions
          }
        },
        "postcss-loader",
        {
          loader: "less-loader",
          options: {
            paths: [
              path.resolve( userpath, "./src/Frontend/Styles/" )
            ],
            ...compilerConfig.lessLoaderOptions
          }
        }
      ],
      threadPool: HappyThreadPool
    })
  ],
  optimization: {
    splitChunks: {
      chunks: "all",
      minSize: 0,
      minChunks: 1,
      maxAsyncRequests: 6,
      maxInitialRequests: 5,
      automaticNameDelimiter: '+',
      name: true,
      cacheGroups: {
        ...compilerConfig.cacheGroups,
        vendors: {
          name: "vendors",
          test: /node_modules[\\/]/,
          priority: -8
        },
        "directStack-part1": {
          name: "directStack-part1",
          test: /(redux[\\/]|react-router[\\/]|react-router-dom[\\/]|history[\\/]|react-redux[\\/]|lodash[\\/]|react-transition-group[\\/]|babel-runtime[\\/]|core-js[\\/])([\\/]node_modules)?/,
          priority: Infinity
        },
        "directStack-part2": {
          name: "directStack-part2",
          test: /(react[\\/]|simple-direct[\\/]|style-loader[\\/]|css-loader[\\/]|engine\.io-(client|parser)[\\/]|react-dom[\\/]|socket\.io-(client|parser)[\\/]|process[\\/]|fbjs[\\/]|component-emitter[\\/]|ms[\\/]|dom-helpers[\\/]|webpack[\\/]|lodash-es[\\/]|prop-types[\\/]|object-assign[\\/]|blob[\\/]|parseuri[\\/])([\\/]node_modules)?/,
          priority: Infinity
        },
        commons: {
          minSize: 30 * 1024,
          minChunks: 2,
          reuseExistingChunk: true,
          priority: -9
        },
        default: false
      }
    }
  },
  mode: "development"
};
