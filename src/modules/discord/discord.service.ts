import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  TextChannel,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { SlashCommand } from './interfaces/command.interface';
import { SLASH_COMMANDS } from './constants/commands.token';

@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordService.name);
  readonly client: Client;
  private readonly commandMap = new Map<string, SlashCommand>();

  constructor(
    @Inject(SLASH_COMMANDS) private readonly commands: SlashCommand[],
  ) {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
  }

  async onModuleInit() {
    for (const cmd of this.commands) {
      this.commandMap.set(cmd.data.name, cmd);
    }

    await this.registerSlashCommands();

    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction as AutocompleteInteraction);
        return;
      }
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction as ChatInputCommandInteraction);
      }
    });

    this.client.once('ready', (c) => {
      this.logger.log(`Logged in as ${c.user.tag}`);
    });

    await this.client.login(process.env.DISCORD_TOKEN);
  }

  async onModuleDestroy() {
    this.client.destroy();
  }

  private async registerSlashCommands() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (!token || !clientId || !guildId) {
      this.logger.warn('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID — skipping command registration');
      return;
    }

    const rest = new REST().setToken(token);
    const commandData = this.commands.map((c) => c.data.toJSON());

    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandData,
      });
      this.logger.log(`Registered ${commandData.length} slash command(s) to guild ${guildId}`);
    } catch (err) {
      this.logger.error('Failed to register slash commands', err);
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const command = this.commandMap.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      this.logger.error(`Error executing /${interaction.commandName}: ${err}`);
      const reply = { content: `❌ Lỗi: ${err}`, ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  }

  private async handleAutocomplete(interaction: AutocompleteInteraction) {
    const command = this.commandMap.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (err) {
      this.logger.error(`Autocomplete error for /${interaction.commandName}: ${err}`);
      await interaction.respond([]);
    }
  }

  async sendEmbed(channelId: string, embed: EmbedBuilder) {
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      this.logger.warn(`Channel ${channelId} not found or not a text channel`);
      return;
    }
    await (channel as TextChannel).send({ embeds: [embed] });
  }

  async sendMessage(channelId: string, content: string) {
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;
    await (channel as TextChannel).send({ content });
  }
}
